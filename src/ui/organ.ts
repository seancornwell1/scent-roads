import { recognizeAccords } from '../game/accords';
import { content, familiesById, materialsById } from '../game/content';
import { drydown } from '../game/evaporation';
import { percentages, totalParts } from '../game/formula';
import { findBrief } from '../game/clients';
import { LAYERS, type Material } from '../game/types';
import { nextTier, unlockedMaterialIds } from '../game/unlocks';
import { state } from '../state';
import { drydownGraph, familyName } from './graph';
import { esc, formatParts, header } from './html';

const STEPS = [0.5, 1, 5];
const LAYER_NAMES = { top: 'Top', heart: 'Heart', base: 'Base' } as const;

export function organScreen(): string {
  const { ui, save } = state;
  const total = totalParts(save.draft);
  const body = ui.organTab === 'materials' ? materialsTab() : formulaTab();
  return `${header('The organ')}
    ${orderBanner()}
    ${accordBanner()}
    <main class="organ">${body}</main>
    <nav class="tabs">
      <button class="${ui.organTab === 'materials' ? 'on' : ''}" data-action="tab" data-tab="materials">Materials</button>
      <button class="${ui.organTab === 'formula' ? 'on' : ''}" data-action="tab" data-tab="formula">Formula · ${formatParts(total)} parts</button>
    </nav>
    ${ui.detail ? detailSheet(materialsById.get(ui.detail)!) : ''}`;
}

/** Who you're composing for, with their memory and anything they've told you. */
function orderBanner(): string {
  const { ui, save } = state;
  const visit = save.customers?.visits.find((v) => v.id === ui.orderId && v.status === 'waiting');
  if (!visit) return '';
  const brief = findBrief(visit.briefId)!;
  const hints = brief.hints.slice(0, visit.hintsAsked).map((h) => `<span class="small">“${esc(h)}”</span>`).join('<br>');
  const ready = totalParts(save.draft) > 0;
  return `<div class="order">
    <p class="small"><strong>For ${esc(visit.name)}:</strong> “${esc(brief.memory)}”</p>
    ${hints ? `<p class="muted">${hints}</p>` : ''}
    <div class="row-between">
      <button class="link" data-action="drop-order">Not now</button>
      <button class="primary" data-action="hand-over" ${ready ? '' : 'disabled'}>Hand over to ${esc(visit.name)}</button>
    </div>
  </div>`;
}

function accordBanner(): string {
  if (state.ui.newAccords.length === 0) return '';
  const names = state.ui.newAccords.map((id) => content.accords.find((a) => a.id === id)?.name ?? id);
  return `<div class="banner">
    <span>New accord: <strong>${esc(names.join(', '))}</strong> — added to your formula book.</span>
    <button class="link" data-action="dismiss-accords">OK</button>
  </div>`;
}

function stepPicker(): string {
  const chips = STEPS.map(
    (s) => `<button class="chip ${state.ui.step === s ? 'on' : ''}" data-action="step" data-step="${s}">${formatParts(s)}</button>`,
  ).join('');
  return `<div class="row-between"><span class="muted small">Parts per tap</span><div class="chips">${chips}</div></div>`;
}

function materialsTab(): string {
  const { browseBy } = state.ui;
  const toggle = `<div class="chips">
    <button class="chip ${browseBy === 'layer' ? 'on' : ''}" data-action="browse" data-by="layer">By layer</button>
    <button class="chip ${browseBy === 'family' ? 'on' : ''}" data-action="browse" data-by="family">By family</button>
  </div>`;
  const byName = (a: Material, b: Material) => a.name.localeCompare(b.name);
  const reputation = state.save.customers?.reputation ?? 0;
  const unlocked = unlockedMaterialIds(reputation);
  const owned = content.materials.filter((m) => unlocked.has(m.id));
  const groups =
    browseBy === 'layer'
      ? LAYERS.map((layer) => ({ title: LAYER_NAMES[layer], items: owned.filter((m) => m.layer === layer) }))
      : content.families.map((f) => ({ title: f.name, items: owned.filter((m) => m.family === f.id) }));
  const next = nextTier(reputation);
  const upcoming = next
    ? `<p class="muted small next-tier">More materials at reputation ${next.reputation}: <strong>${esc(next.name)}</strong> (${next.materials.length} new).</p>`
    : '';
  const list = groups
    .filter((g) => g.items.length > 0)
    .map((g) => `<h2>${esc(g.title)}</h2><ul class="list">${g.items.sort(byName).map(materialRow).join('')}</ul>`)
    .join('');
  return `<div class="row-between">${toggle}</div>${stepPicker()}${list}${upcoming}`;
}

function materialRow(m: Material): string {
  const parts = state.save.draft[m.id];
  const sub = state.ui.browseBy === 'layer' ? familyName(m.family) : LAYER_NAMES[m.layer];
  return `<li class="material">
    <button class="material-add" data-action="add" data-id="${esc(m.id)}">
      <span class="material-name">${esc(m.name)}</span>
      <span class="muted small">${esc(sub)}${tags(m)}</span>
    </button>
    ${parts ? `<span class="count">${formatParts(parts)}</span>` : ''}
    <button class="info" data-action="detail" data-id="${esc(m.id)}" aria-label="About ${esc(m.name)}">Info</button>
  </li>`;
}

function tags(m: Material): string {
  let out = '';
  if (!m.verified) out += ' <span class="tag tag--warn">unverified</span>';
  return out;
}

function formulaTab(): string {
  const { draft } = state.save;
  const ids = Object.keys(draft);
  if (ids.length === 0) {
    return `<p class="empty">Nothing on the organ yet. Open <strong>Materials</strong> and tap a material to add parts.</p>`;
  }
  const pct = percentages(draft);
  const rows = ids
    .map((id) => materialsById.get(id)!)
    .sort((a, b) => LAYERS.indexOf(a.layer) - LAYERS.indexOf(b.layer) || draft[b.id] - draft[a.id])
    .map(
      (m) => `<li class="formula-row">
        <span class="swatch fam-${esc(m.family)}"></span>
        <span class="formula-name">${esc(m.name)}<span class="muted small"> ${LAYER_NAMES[m.layer]}</span></span>
        <span class="formula-pct muted small">${pct[m.id].toFixed(1)}%</span>
        <button class="pm" data-action="dec" data-id="${esc(m.id)}" aria-label="Fewer parts">−</button>
        <span class="formula-parts">${formatParts(draft[m.id])}</span>
        <button class="pm" data-action="inc" data-id="${esc(m.id)}" aria-label="More parts">+</button>
      </li>`,
    )
    .join('');
  const accords = recognizeAccords(draft, content.accords, materialsById);
  const accordLine = accords.length
    ? accords.map((a) => `<span class="chip on">${esc(a.name)}</span>`).join('')
    : '<span class="muted small">No accord recognized yet.</span>';
  return `${stepPicker()}
    <ul class="list">${rows}</ul>
    <div class="row-between"><span class="muted small">Total</span><strong>${formatParts(totalParts(draft))} parts</strong></div>
    <h2>Accords</h2><div class="chips">${accordLine}</div>
    <h2>Drydown</h2>
    <p class="muted small">Who dominates at each stage. Bar length shows how loud it still is next to the opening.</p>
    ${drydownGraph(drydown(draft, materialsById, content.model))}
    <h2>Save to formula book</h2>
    <div class="save-row">
      <input id="save-name" type="text" maxlength="40" placeholder="Formula ${state.save.formulas.length + 1}" />
      <button class="primary" data-action="save">Save</button>
    </div>
    <button class="link danger" data-action="clear">Clear the organ</button>`;
}

function detailSheet(m: Material): string {
  const o = m.origin;
  const origin = [o.plant, o.region, o.method, o.note].filter(Boolean).map((x) => `<li>${esc(x!)}</li>`).join('');
  const source = m.type === 'natural' ? 'Grown: sourced on the world map' : 'Catalogue: ordered from the supplier';
  const course = `${source}${m.course.mission ? ` · course mission ${esc(m.course.mission)}` : ''}`;
  const unverified = m.verified
    ? ''
    : `<p class="tag tag--warn block">Unverified: ${esc(m.check.map((field) => field.split('.').pop()).join(', '))}. Listed in the fact check.</p>`;
  return `<div class="sheet-backdrop" data-action="close-detail"></div>
  <section class="sheet" role="dialog" aria-label="${esc(m.name)}">
    <h2>${esc(m.name)}</h2>
    <p class="muted small">${m.type === 'natural' ? 'Natural' : 'Synthetic'} · ${esc(familiesById.get(m.family)?.name ?? m.family)} · ${LAYER_NAMES[m.layer]} note · ${esc(m.volatility)} volatility</p>
    ${unverified}
    <p>${esc(m.character)}</p>
    ${m.behaviour ? `<p><strong>In blends:</strong> ${esc(m.behaviour)}</p>` : ''}
    <h3>Origin</h3><ul class="plain">${origin}</ul>
    <p class="muted small">${course}</p>
    <p class="muted small">On hand (test stock): ${formatParts(state.save.stock[m.id] ?? 0)} g</p>
    <div class="row-between">
      <button class="link" data-action="close-detail">Close</button>
      <button class="primary" data-action="add" data-id="${esc(m.id)}">Add ${formatParts(state.ui.step)} part${state.ui.step === 1 ? '' : 's'}</button>
    </div>
  </section>`;
}
