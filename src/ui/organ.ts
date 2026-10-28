import { recognizeAccords } from '../game/accords';
import { DILUTIONS, baseKey, effective, isBaseKey, partsTotal, written, type Entry } from '../game/blend';
import { blockers, checkPerfume, sellable } from '../game/checks';
import { content, materialsById } from '../game/content';
import { drydown } from '../game/evaporation';
import { clients, findBrief, type Brief, type ScoringConfig } from '../game/clients';
import { rankById, scoringFor } from '../game/ranks';
import { signature } from '../game/signature';
import { challengeBrief, lab } from '../game/lab';
import { LAYERS, type Material } from '../game/types';
import { missingFor, qualityWord, stockOf, stockQuality } from '../game/sourcing';
import { nextTier } from '../game/unlocks';
import { ownedMaterials } from '../game/world';
import { pageById } from '../game/story';
import { currentRank, draftBlend, nowGame, state } from '../state';
import { pageCard } from './book';
import { houseUnlocked } from './house';
import { compendiumEntry } from './compendium';
import { currentStreak, dayNumber, nextQuestion } from '../game/learning';
import { drydownGraph, familyName } from './graph';
import { esc, formatParts, header } from './html';

const LAYER_NAMES = { top: 'Top', heart: 'Heart', base: 'Base' } as const;
/** Parts per tap offered, by the largest total your rank allows. */
export function stepsFor(max: number): number[] {
  return max >= 1000 ? [1, 10, 50, 100] : max > 10 ? [1, 5, 10] : [1];
}

export function organScreen(): string {
  const { ui } = state;
  const total = partsTotal(draftBlend());
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

/**
 * What you're composing for: a waiting customer, her perfume, a lab reconstruction, or a rank
 * exam's accord. `exam` shows every hint up front; `fromStock` weighs it out of your stock
 * (everything but an exam, where the examiners use their own materials).
 */
export interface Order {
  name: string;
  brief: Brief;
  exam: boolean;
  fromStock: boolean;
  /** Totals the perfume must have: a rank's order parts, or for an exam, its usual parts. */
  parts: number[];
  /** How it's judged: the rank's star thresholds (an exam, the rank being sat for). */
  scoring: ScoringConfig;
}

export function currentOrder(): Order | null {
  const { ui, save } = state;
  const rank = currentRank();
  const mine = { parts: rank.orderParts, scoring: scoringFor(rank, clients.scoring) };
  if (ui.orderId === 'signature') return { name: 'her', brief: signature.brief, exam: true, fromStock: true, ...mine };
  if (ui.orderId?.startsWith('challenge:')) {
    const c = lab.challenges.find((x) => `challenge:${x.id}` === ui.orderId);
    return c ? { name: c.name, brief: challengeBrief(c), exam: true, fromStock: true, ...mine } : null;
  }
  if (ui.orderId === 'exam') {
    const sitting = save.exam ? rankById(save.exam.rank) : undefined;
    const brief = sitting?.exam?.accord;
    return sitting && brief ? { name: 'the examiners', brief, exam: true, fromStock: false, parts: rank.wearableParts, scoring: scoringFor(sitting, clients.scoring) } : null;
  }
  const visit = save.customers?.visits.find((v) => v.id === ui.orderId && v.status === 'waiting');
  const brief = visit && findBrief(visit.briefId);
  return visit && brief ? { name: visit.name, brief, exam: false, fromStock: true, ...mine } : null;
}

function entryName(e: Entry): string {
  return `${materialsById.get(e.material)?.name ?? e.material}${e.dilution < 100 ? ` at ${e.dilution}%` : ''}`;
}

/** Who you're composing for, with their memory and anything they've told you, and what still stops it being sold. */
function orderBanner(): string {
  const { ui, save } = state;
  const order = currentOrder();
  if (!order) return '';
  const { brief } = order;
  const visit = save.customers?.visits.find((v) => v.id === ui.orderId);
  const hints = brief.hints.slice(0, order.exam ? brief.hints.length : visit?.hintsAsked ?? 0).map((h) => `<span class="small">“${esc(h)}”</span>`).join('<br>');
  const blend = draftBlend();
  const check = checkPerfume(blend, order.parts, brief.budget);
  const missing = !order.fromStock ? [] : missingFor(save.sourcing!, blend).map(entryName);
  const ready = sellable(check) && missing.length === 0;
  const page = brief.page ? pageById(brief.page) : undefined;
  const why = [...blockers(check), ...(missing.length ? [`Not enough ${missing.join(', ')} in stock: order, harvest or dilute more in the back room.`] : [])];
  return `<div class="order">
    <p class="small"><strong>${ui.orderId === 'signature' ? 'Her perfume' : ui.orderId?.startsWith('challenge:') ? `Reconstruct ${esc(order.name)}` : order.exam ? 'Exam' : `For ${esc(order.name)}`}:</strong> “${esc(brief.memory)}”</p>
    ${hints ? `<p class="muted">${hints}</p>` : ''}
    ${brief.budget !== undefined ? `<p class="small">Budget: <strong>€${brief.budget}</strong> per 100 g of concentrate · this costs €${check.cost.toFixed(2)}</p>` : ''}
    ${page ? `<details class="small"><summary>Her page</summary><ul class="list cards">${pageCard(page, save.story!, false)}</ul></details>` : ''}
    ${why.map((w) => `<p class="small warn-text">${esc(w)}</p>`).join('')}
    <div class="row-between">
      <button class="link" data-action="drop-order">Not now</button>
      <button class="primary" data-action="hand-over" ${ready ? '' : 'disabled'}>${ui.orderId === 'signature' ? 'This is hers' : ui.orderId?.startsWith('challenge:') ? 'Compare with the sample' : order.exam ? 'Hand in to the examiners' : `Hand over to ${esc(order.name)}`}</button>
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

/** Today's nose training, from the organ. */
function trainingButton(): string {
  const l = state.save.learning!;
  const day = dayNumber(new Date());
  const done = l.today?.day === day && nextQuestion(l) < 0;
  const streak = currentStreak(l, day);
  return `<div class="row-between training-row"><span class="small">${done ? 'Nose training done for today' : 'Nose training: a few questions today'} · streak ${streak}</span>
    <button class="chip" data-action="nav" data-to="training">${done ? 'Review' : 'Train'}</button></div>`;
}

/** How full the formula is: a perfume totals exactly one of the totals your rank allows. */
function partsMeter(): string {
  const total = partsTotal(draftBlend());
  const allowed = currentOrder()?.parts ?? currentRank().wearableParts;
  const target = allowed.find((t) => t >= total) ?? allowed[allowed.length - 1];
  const note = allowed.includes(total) ? 'A full formula, ready to wear.' : total > target ? `Too many: take ${formatParts(total - target)} out.` : `${formatParts(target - total)} more to go for ${target} parts.`;
  const options = stepsFor(allowed[allowed.length - 1]);
  const steps = options.length > 1
    ? `<div class="row-between"><span class="muted small">Parts per tap</span><div class="chips">${options.map((n) => `<button class="chip ${state.ui.step === n ? 'on' : ''}" data-action="step" data-step="${n}">${n}</button>`).join('')}</div></div>`
    : '';
  return `<div class="row-between"><span class="muted small">${note}</span><strong>${formatParts(total)} of ${allowed.join(' or ')} parts</strong></div>${steps}`;
}

function materialsTab(): string {
  const { browseBy } = state.ui;
  const toggle = `<div class="chips">
    <button class="chip ${browseBy === 'layer' ? 'on' : ''}" data-action="browse" data-by="layer">By layer</button>
    <button class="chip ${browseBy === 'family' ? 'on' : ''}" data-action="browse" data-by="family">By family</button>
  </div>`;
  const byName = (a: Material, b: Material) => a.name.localeCompare(b.name);
  const reputation = state.save.customers?.reputation ?? 0;
  const unlocked = ownedMaterials(state.save);
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
  return `${trainingButton()}<div class="row-between">${toggle}</div>${partsMeter()}${basesList()}${list}${upcoming}`;
}

/** Your saved accords, each usable as one ingredient. */
function basesList(): string {
  const bases = state.save.bases ?? [];
  if (!currentRank().bases || bases.length === 0) return '';
  const rows = bases
    .map((b) => {
      const parts = state.save.draft[baseKey(b.id)];
      return `<li class="material">
        <button class="material-add" data-action="add" data-id="${esc(baseKey(b.id))}">
          <span class="material-name">${esc(b.name)}</span>
          <span class="muted small">Base · ${esc(Object.keys(b.parts).map((id) => materialsById.get(id)?.name ?? id).join(', '))}</span>
        </button>
        ${parts ? `<span class="count">${formatParts(parts)}</span>` : ''}
      </li>`;
    })
    .join('');
  return `<h2>My bases</h2><ul class="list">${rows}</ul>`;
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

function stockLine(id: string): string {
  const s = state.save.sourcing!;
  const lines = DILUTIONS.filter((d) => stockOf(s, id, d) > 0).map((d) => `${formatGrams(stockOf(s, id, d))}${d < 100 ? ` at ${d}%` : ' neat'} (${qualityWord(stockQuality(s, id, nowGame(), d))})`);
  return lines.length ? `In stock: ${lines.join(', ')}` : 'None in stock: order or harvest it in the back room.';
}

function formatGrams(g: number): string {
  return `${g >= 10 ? Math.round(g) : g.toFixed(1)} g`;
}

function tags(m: Material): string {
  let out = '';
  const grams = stockOf(state.save.sourcing!, m.id);
  out += grams > 0 ? ` <span class="tag">${formatGrams(grams)}</span>` : ' <span class="tag tag--warn">out of stock</span>';
  if (!m.verified) out += ' <span class="tag tag--warn">unverified</span>';
  return out;
}

function formulaTab(): string {
  const { draft } = state.save;
  const keys = Object.keys(draft);
  if (keys.length === 0) {
    return `<p class="empty">Nothing on the organ yet. Open <strong>Materials</strong> and tap a material to add parts.</p>`;
  }
  const rank = currentRank();
  const blend = draftBlend();
  const total = partsTotal(blend);
  const dilutions = state.save.draftDilutions ?? {};
  const row = (key: string, name: string, sub: string, swatch: string, dilution: string) => `<li class="formula-row">
        <span class="swatch fam-${esc(swatch)}"></span>
        <span class="formula-name">${esc(name)}<span class="muted small"> ${esc(sub)}</span>${dilution}</span>
        <span class="formula-pct muted small">${((draft[key] / total) * 100).toFixed(1)}%</span>
        <button class="pm" data-action="dec" data-id="${esc(key)}" aria-label="Fewer parts">−</button>
        <span class="formula-parts">${formatParts(draft[key])}</span>
        <button class="pm" data-action="inc" data-id="${esc(key)}" aria-label="More parts">+</button>
      </li>`;
  const baseRows = keys
    .filter(isBaseKey)
    .map((key) => {
      const base = state.save.bases?.find((b) => baseKey(b.id) === key);
      return row(key, base?.name ?? 'A deleted base', 'Base', base ? (materialsById.get(Object.keys(base.parts)[0])?.family ?? '') : '', '');
    })
    .join('');
  const materialRows = keys
    .filter((k) => !isBaseKey(k))
    .map((id) => materialsById.get(id)!)
    .sort((a, b) => LAYERS.indexOf(a.layer) - LAYERS.indexOf(b.layer) || draft[b.id] - draft[a.id])
    .map((m) => {
      const d = dilutions[m.id] ?? 100;
      const chips = rank.dilutions
        ? `<span class="chips dilution-chips">${DILUTIONS.map((x) => `<button class="chip ${x === d ? 'on' : ''}" data-action="set-dilution" data-id="${esc(m.id)}" data-value="${x}">${x}%</button>`).join('')}</span>`
        : '';
      return row(m.id, m.name, LAYER_NAMES[m.layer], m.family, chips);
    })
    .join('');
  const check = checkPerfume(blend, rank.wearableParts);
  const warnings = [
    ...check.harsh.map((id) => `${materialsById.get(id)!.name} is far too strong at this strength: it will smell harsh. Use less, or dilute it.`),
    ...check.safety.map((x) => `${materialsById.get(x.material)!.name}: ${x.finishedPercent.toFixed(2)}% of the finished perfume, over its safety limit of ${x.limit}%. It can't be sold like this.`),
  ];
  const accords = recognizeAccords(written(blend), content.accords, materialsById);
  const accordLine = accords.length
    ? accords.map((a) => `<span class="chip on">${esc(a.name)}</span>`).join('')
    : '<span class="muted small">No accord recognized yet.</span>';
  const scale = (total === 10 || total === 100) && rank.wearableParts.includes(total * 10) ? `<button class="link" data-action="scale-up">Scale to ${total * 10} parts</button>` : '';
  return `${partsMeter()}
    <ul class="list">${baseRows}${materialRows}</ul>
    ${scale}
    ${rank.dilutions ? '' : '<p class="muted small">Junior perfumers can dilute materials to 10% or 1%: pass the exam (More → Your rank).</p>'}
    <h2>Checks</h2>
    ${warnings.map((w) => `<p class="small warn-text">${esc(w)}</p>`).join('') || '<p class="small">Within every safety limit, and nothing too strong.</p>'}
    <p class="muted small">Costs about €${check.cost.toFixed(2)} per 100 g of concentrate. Finished perfume is ${content.model.wearableConcentration}% concentrate. Safety limits and costs are unconfirmed.</p>
    <h2>Accords</h2><div class="chips">${accordLine}</div>
    <h2>Drydown</h2>
    <p class="muted small">Who dominates at each stage. Bar length shows how loud it still is next to the opening.</p>
    ${drydownGraph(drydown(effective(blend), materialsById, content.model))}
    <h2>Save to formula book</h2>
    <div class="save-row">
      <input id="save-name" type="text" maxlength="40" placeholder="Formula ${state.save.formulas.length + 1}" />
      <button class="primary" data-action="save">Save</button>
    </div>
    ${rank.bases ? '<button class="link" data-action="save-base">Save as a base (use it inside other formulas)</button>' : ''}
    ${houseUnlocked() ? '<button class="link" data-action="house-from-draft">Sell it as a house perfume</button>' : ''}
    <button class="link danger" data-action="clear">Clear the organ</button>`;
}

/** A material's compendium page, as a sheet over the organ. */
function detailSheet(m: Material): string {
  const source = m.type === 'natural' ? 'Grown: harvested on the map, or from the apothecary' : 'Catalogue: ordered from the chemist';
  const course = `${source}${m.course.mission ? ` · course mission ${esc(m.course.mission)}` : ''}`;
  return `<div class="sheet-backdrop" data-action="close-detail"></div>
  <section class="sheet" role="dialog" aria-label="${esc(m.name)}">
    ${compendiumEntry(
      m,
      `<p class="muted small">${course}</p>
      <p class="muted small">${stockLine(m.id)}</p>
      <div class="row-between">
        <button class="link" data-action="close-detail">Close</button>
        <button class="primary" data-action="add" data-id="${esc(m.id)}">Add 1 part</button>
      </div>`,
    )}
  </section>`;
}
