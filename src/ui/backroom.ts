import { MONTH_NAMES, dateAt, realMsUntil } from '../game/clock';
import { materialsById } from '../game/content';
import {
  owns,
  priceOf,
  processes,
  qualityWord,
  regions,
  sourcing,
  stockQuality,
  type Crop,
  type Region,
} from '../game/sourcing';
import { priceMultiplier } from '../game/events';
import { chapterInfo, routeById, unreadLetters, type Letter } from '../game/routes';
import { newsFor, ownedMaterials } from '../game/world';
import { lab } from '../game/lab';
import { nowGame, state } from '../state';
import { esc, starsText } from './html';

// The laptop: crates that have arrived, her suppliers' letters, the map of where materials
// come from, the supplier, and the stock room. Times show as real time
// left at the current speed.

export type BackroomTab = 'letters' | 'map' | 'harvests' | 'supplier' | 'stock' | 'lab';
// Harvests are gone (no waiting for materials) and the lab is hidden for now (Nov 8): their
// tabs aren't shown, though old saves' harvests in progress still arrive.
const TABS: { id: BackroomTab; label: string }[] = [
  { id: 'letters', label: 'Letters' },
  { id: 'map', label: 'Map' },
  { id: 'supplier', label: 'Supplier' },
  { id: 'stock', label: 'Stock' },
];
const SPEEDS = [1, 60, 600];
const SHORT_MONTHS = MONTH_NAMES.map((m) => m.slice(0, 3));

export function backroomScreen(): string {
  const { ui, save } = state;
  const now = nowGame();
  const date = dateAt(now, sourcing.calendarStart);
  const tab = ui.backroomTab;
  const unread = unreadLetters(save.routes!);
  const count = (id: BackroomTab) => (id === 'letters' && unread > 0 ? ` · ${unread}` : '');
  const tabs = TABS.map((t) => `<button class="tab-chip ${t.id === tab ? 'on' : ''}" data-action="backroom-tab" data-value="${t.id}">${t.label}${count(t.id)}</button>`).join('');
  const body = tab === 'letters' ? lettersTab() : tab === 'map' ? mapTab() : tab === 'supplier' ? supplierTab() : stockTab(now);
  const speed = save.clock!.speed;
  return `<header class="bar-top">
      <button class="link" data-action="close-panel">Close</button>
      <h1>Laptop</h1>
      <span></span>
    </header>
    <p class="muted small">${date.day} ${MONTH_NAMES[date.month - 1]}, year ${date.year} · ${save.customers!.money} coins</p>
    ${cratesSection()}
    <nav class="tab-chips">${tabs}</nav>
    <main class="backroom">${body}</main>
    <p class="muted small debug">Debug · time speed:
      ${SPEEDS.map((v) => `<button class="tab-chip ${speed === v ? 'on' : ''}" data-action="debug-speed" data-value="${v}">×${v}</button>`).join(' ')}
    </p>`;
}

function name(material: string): string {
  return materialsById.get(material)?.name ?? material;
}

/** Real time left until a game time, as "2 h 5 min". */
export function timeLeft(gameHours: number): string {
  const ms = realMsUntil(state.save.clock!, gameHours, Date.now());
  const minutes = Math.ceil(ms / 60_000);
  if (ms < 60_000) return `${Math.max(1, Math.ceil(ms / 1000))} s`;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  if (h >= 48) return `${Math.floor(h / 24)} days${h % 24 ? ` ${h % 24} h` : ''}`;
  return `${h} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
}

/** Real time a span of game hours takes at the current speed. */

function cratesSection(): string {
  const crates = state.save.sourcing!.crates;
  if (crates.length === 0) return '';
  const rows = crates
    .map(
      (c) => `<li class="card crate">
        <div><strong>Crate from ${esc(c.from)}</strong>${c.route && routeById(c.route) ? ` <span class="muted small">· a letter from ${esc(routeById(c.route)!.from)} is tucked in the lid (Letters)</span>` : ''}</div>
        <p class="small">${c.items.map((i) => `${esc(name(i.material))} · ${i.grams} g · ${qualityWord(i.quality)}`).join('<br>')}</p>
        <div class="row-between"><span></span><button class="primary" data-action="unpack" data-id="${esc(c.id)}">Unpack</button></div>
      </li>`,
    )
    .join('');
  return `<h2>${crates.length === 1 ? 'A crate has' : `${crates.length} crates have`} arrived</h2><ul class="list cards">${rows}</ul>`;
}

function seasonText(crop: Crop): string {
  if (crop.months.length === 12) return 'All year';
  // Show runs of months, e.g. "Nov–Mar".
  const sorted = [...crop.months];
  const start = sorted.find((m) => !sorted.includes(m === 1 ? 12 : m - 1)) ?? sorted[0];
  const end = sorted.find((m) => !sorted.includes(m === 12 ? 1 : m + 1)) ?? sorted[sorted.length - 1];
  return start === end ? SHORT_MONTHS[start - 1] : `${SHORT_MONTHS[start - 1]}–${SHORT_MONTHS[end - 1]}`;
}


/**
 * Her suppliers' letters: flavour, not business. Each tells you about their material family
 * and how it's grown, harvested or made. They arrive with the seasons.
 */
function letterCard(l: Letter): string {
  const route = routeById(l.route);
  if (!route) return '';
  return `<li class="card letter-card">
    <div><strong>${esc(route.from)}</strong>${l.read ? '' : ' <span class="tag">new</span>'}${route.loreVerified ? '' : ' <span class="tag tag--warn">unverified</span>'}</div>
    <p class="muted small">${esc(route.about)}</p>
    <div class="letter">${route.lore.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
  </li>`;
}

function lettersTab(): string {
  const r = state.save.routes!;
  const chapter = chapterInfo(r.chapter, sourcing.calendarStart);
  const letters = r.letters
    .filter((l) => l.kind === 'first')
    .slice()
    .reverse()
    .map(letterCard)
    .join('');
  return `<p class="muted small"><strong>Chapter ${r.chapter + 1} · ${esc(chapter.title)}.</strong> Her old suppliers write about their materials and how they're made. New letters come with the seasons.</p>
    <ul class="list cards">${letters || '<li class="muted">No letters yet.</li>'}</ul>`;
}

/** The map: where her materials come from, and how each is harvested. Flavour only. */
function mapTab(): string {
  const cards = regions.map(regionCard).join('');
  return `<div class="placeholder placeholder--map">Placeholder: painted world map</div>
    <p class="muted small">Where her materials come from, and how they're gathered.</p>
    <ul class="list cards">${cards}</ul>`;
}

function regionCard(r: Region): string {
  const crops = r.crops
    .map((crop) => {
      const m = materialsById.get(crop.material)!;
      const methods = crop.methods.map((id) => processes.find((p) => p.id === id)?.name ?? id).join(', ');
      return `<p class="small"><strong>${esc(m.name)}</strong> <span class="muted">· season ${seasonText(crop)}${crop.verified ? '' : ' <span class="tag tag--warn">unverified</span>'} · ${esc(methods)}</span></p>`;
    })
    .join('');
  return `<li class="card">
    <div><strong>${esc(r.name)}</strong> <span class="muted small">${esc(r.country)}</span></div>
    <p class="small">${esc(r.quirk)}</p>
    ${crops}
  </li>`;
}

function supplierTab(): string {
  const unlocked = ownedMaterials(state.save);
  const stock = state.save.sourcing!;
  const sup = sourcing.supplier;
  const row = (id: string, kind: string) => {
    const m = materialsById.get(id)!;
    const multiplier = priceMultiplier(newsFor(state.save, nowGame()), m.id);
    const price = priceOf(m.id, multiplier);
    const mine = owns(stock, m.id);
    const deal = mine ? '' : multiplier < 1 ? ' <span class="tag">on offer</span>' : multiplier > 1 ? ' <span class="tag tag--warn">prices up</span>' : '';
    const buy = mine
      ? '<span class="tag">yours</span>'
      : `<button class="primary" data-action="order" data-material="${m.id}" ${state.save.customers!.money < price ? 'disabled' : ''}>${price} coins</button>`;
    return `<li class="card"><div class="row-between">
      <button class="supplier-item" data-action="supplier-info" data-material="${m.id}"><strong>${esc(m.name)}</strong>${deal}<br><span class="muted small">${mine ? 'yours to use, as much as you like' : kind}</span></button>
      ${buy}</div></li>`;
  };
  const list = [...unlocked].map((id) => materialsById.get(id)!).sort((a, b) => Number(owns(stock, a.id)) - Number(owns(stock, b.id)) || a.name.localeCompare(b.name));
  const naturals = list.filter((m) => m.type === 'natural').map((m) => row(m.id, `from the broker · ${qualityWord(sup.brokerQuality)} quality`)).join('');
  const synthetics = list.filter((m) => m.type === 'synthetic').map((m) => row(m.id, 'from the catalogue')).join('');
  const info = state.ui.supplierInfo ? supplierCard(state.ui.supplierInfo) : '';
  return `<h2>${esc(sup.name)}</h2>
    <p class="muted small">Buy a material once and it's yours for good: use as much as you like. Tap a name to read about it.</p>
    <ul class="list cards">${naturals || '<li class="muted">No naturals unlocked.</li>'}</ul>
    <h2>${esc(sup.chemistName)}</h2>
    <p class="muted small">Her old chemist: aroma chemicals from the catalogue.</p>
    <ul class="list cards">${synthetics || '<li class="muted">No aroma chemicals unlocked yet.</li>'}</ul>
    ${info}`;
}

/** A material's card, floating over the supplier tab: what it smells like, how it behaves, where it's from. */
function supplierCard(id: string): string {
  const m = materialsById.get(id);
  if (!m) return '';
  const stock = state.save.sourcing!;
  const mine = owns(stock, id);
  const price = priceOf(id, priceMultiplier(newsFor(state.save, nowGame()), id));
  const origin = m.origin ? [m.origin.plant, m.origin.region, m.origin.method].filter(Boolean).map((x) => esc(String(x))).join(' · ') : '';
  const layer = { top: 'Top note', heart: 'Heart note', base: 'Base note' }[m.layer as string] ?? '';
  return `<div class="popover-backdrop" data-action="supplier-info-close">
    <div class="popover" role="dialog" aria-label="${esc(m.name)}" data-action="supplier-info-stay">
      <button class="popover-close link" data-action="supplier-info-close" aria-label="Close">×</button>
      <h2>${esc(m.name)}</h2>
      <p class="muted small">${esc(m.family)}${layer ? ` · ${layer}` : ''} · ${m.type === 'synthetic' ? 'aroma chemical' : 'natural'}${m.verified ? '' : ' <span class="tag tag--warn">unverified</span>'}</p>
      <p>${esc(m.character)}</p>
      ${m.behaviour ? `<p class="small">${esc(m.behaviour)}</p>` : ''}
      ${origin ? `<p class="muted small">${origin}</p>` : ''}
      <div class="row-between">
        <span class="muted small">${mine ? `Yours · ${qualityWord(stockQuality(stock, id, nowGame()))} quality` : 'Buy once, use as much as you like.'}</span>
        ${mine ? '' : `<button class="primary" data-action="order" data-material="${esc(id)}" ${state.save.customers!.money < price ? 'disabled' : ''}>${price} coins</button>`}
      </div>
    </div>
  </div>`;
}

function stockTab(now: number): string {
  const s = state.save.sourcing!;
  const materials = Object.keys(s.owned).sort((a, b) => name(a).localeCompare(name(b)));
  if (materials.length === 0) return '<p class="muted">Nothing is yours yet. Buy materials from the supplier.</p>';
  const rows = materials
    .map((id) => {
      const ages = sourcing.aging[id] ? ' · improving with age' : '';
      return `<li class="card"><div><strong>${esc(name(id))}</strong></div>
        <p class="muted small">As much as you need, neat or diluted · ${qualityWord(stockQuality(s, id, now))} quality${ages}</p></li>`;
    })
    .join('');
  return `<p class="muted small">Everything you've bought is yours for good, in any amount and at any dilution.</p><ul class="list cards">${rows}</ul>`;
}

/** The analysis lab and its reconstruction challenges. */
/** The lab tab: hidden for now while Sean decides whether to keep the lab (Nov 8). */
export function labTab(): string {
  const l = state.save.lab!;
  const money = state.save.customers!.money;
  const reputation = state.save.customers!.reputation;
  const current = l.level > 0 ? lab.levels[l.level - 1] : null;
  const next = lab.levels[l.level];
  const equipment = `<li class="card"><div><strong>${current ? esc(current.name) : 'No equipment yet'}</strong></div>
    ${current ? `<p class="muted small">${esc(current.about)}</p>` : '<p class="muted small">A chromatograph separates a perfume into its components, so you can see what it is made of.</p>'}
    ${next ? `<div class="row-between"><span class="muted small">${esc(next.name)}: ${esc(next.about)}</span>${reputation < next.reputation ? `<span class="muted small">Reputation ${next.reputation}</span>` : `<button class="primary" data-action="lab-upgrade" ${money < next.coins ? 'disabled' : ''}>${next.coins} coins</button>`}</div>` : ''}
  </li>`;
  const challenges = lab.challenges
    .filter((c) => reputation >= c.reputation)
    .map((c) => {
      const a = l.analyses[c.id];
      const best = l.challenges[c.id]?.best ?? 0;
      const result = a
        ? `<p class="small"><strong>Analysis:</strong> ${a.components.map((x) => `${esc(materialsById.get(x.material)?.name ?? x.material)}${x.percent !== undefined ? ` ${x.percent}%` : ''}`).join(', ')}${a.level < lab.levels.length ? ' …' : ''}</p>`
        : '';
      return `<li class="card"><div><strong>${esc(c.name)}</strong> <span class="muted small">${esc(c.era)}</span>${best ? ` <span class="stars small">${starsText(best)}</span>` : ''}</div>
        <p class="small">${esc(c.about)}</p>
        <p class="muted small">Top: ${esc(c.structure.top)}. Heart: ${esc(c.structure.heart)}. Base: ${esc(c.structure.base)}.</p>
        ${result}
        <div class="row-between">
          <button class="link" data-action="lab-run" data-id="${esc(c.id)}" ${l.level === 0 || money < lab.runCost ? 'disabled' : ''}>Analyse the sample · ${lab.runCost} coins</button>
          <button class="primary" data-action="challenge-compose" data-id="${esc(c.id)}">Reconstruct</button>
        </div>
        <p class="muted small">Three stars earns ${c.reward.coins} coins and reputation +${c.reward.reputation}, once.</p>
      </li>`;
    })
    .join('');
  const upcoming = lab.challenges.filter((c) => reputation < c.reputation).length;
  return `<p class="muted small">Reconstruct well-known perfume styles from their public structure (the names are the shop's own). Analysing a sample shows its biggest components; better equipment shows more.</p>
    <ul class="list cards">${equipment}</ul>
    <h2>Reconstructions</h2>
    <ul class="list cards">${challenges || '<li class="muted">The first reconstruction comes at reputation 4.</li>'}</ul>
    ${upcoming ? `<p class="muted small">${upcoming} more come with reputation.</p>` : ''}`;
}
