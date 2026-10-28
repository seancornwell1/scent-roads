import { MONTH_NAMES, dateAt, realMsUntil } from '../game/clock';
import { materialsById } from '../game/content';
import {
  contractStage,
  harvestQuality,
  inSeason,
  priceOf,
  processes,
  qualityWord,
  regions,
  shippingGameHours,
  sourcing,
  stockOf,
  stockQuality,
  type Crop,
  type Region,
} from '../game/sourcing';
import { priceMultiplier, shippingDelay, yieldMultiplier } from '../game/events';
import { unlockedMaterialIds, unlocks } from '../game/unlocks';
import { processStats, regionOpen } from '../game/upgrades';
import { newsFor } from '../game/world';
import { nowGame, state } from '../state';
import { esc } from './html';

// The back room: crates that have arrived, the sourcing map, harvests in progress,
// the supplier, and the stock room. Times show as real time left at the current speed.

export type BackroomTab = 'map' | 'harvests' | 'supplier' | 'stock';
const TABS: { id: BackroomTab; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'harvests', label: 'Harvests' },
  { id: 'supplier', label: 'Supplier' },
  { id: 'stock', label: 'Stock' },
];
const SPEEDS = [1, 60, 600];
const SHORT_MONTHS = MONTH_NAMES.map((m) => m.slice(0, 3));

export function backroomScreen(): string {
  const { ui, save } = state;
  const s = save.sourcing!;
  const now = nowGame();
  const date = dateAt(now, sourcing.calendarStart);
  const tab = ui.backroomTab;
  const tabs = TABS.map((t) => `<button class="tab-chip ${t.id === tab ? 'on' : ''}" data-action="backroom-tab" data-value="${t.id}">${t.label}${t.id === 'harvests' && s.contracts.length + s.batches.length + s.shipments.length > 0 ? ` · ${s.contracts.length + s.batches.length + s.shipments.length}` : ''}</button>`).join('');
  const body = tab === 'map' ? mapTab(now) : tab === 'harvests' ? harvestsTab(now) : tab === 'supplier' ? supplierTab() : stockTab(now);
  const speed = save.clock!.speed;
  return `<header class="bar-top">
      <button class="link" data-action="close-panel">Close</button>
      <h1>Back room</h1>
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
  return `${h} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
}

/** Real time a span of game hours takes at the current speed. */
function duration(gameHours: number): string {
  return timeLeft(nowGame() + gameHours);
}

function cratesSection(): string {
  const crates = state.save.sourcing!.crates;
  if (crates.length === 0) return '';
  const rows = crates
    .map(
      (c) => `<li class="card crate">
        <div><strong>Crate from ${esc(c.from)}</strong></div>
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

function nextSeasonMonth(crop: Crop, now: number): string {
  for (let d = 1; d <= 366; d++) {
    const t = now + d * 24;
    if (inSeason(crop, t)) return MONTH_NAMES[dateAt(t, sourcing.calendarStart).month - 1];
  }
  return '';
}

function mapTab(now: number): string {
  const unlocked = unlockedMaterialIds(state.save.customers!.reputation);
  const cards = regions.map((r) => regionCard(r, now, unlocked)).join('');
  return `<div class="placeholder placeholder--map">Placeholder: painted world map</div>
    <p class="muted small">Sign a harvest contract while a crop is in season. It ripens over real time; collect it inside its best window for top quality.</p>
    <ul class="list cards">${cards}</ul>`;
}

function regionCard(r: Region, now: number, unlocked: Set<string>): string {
  const s = state.save.sourcing!;
  const money = state.save.customers!.money;
  const open = regionOpen(state.save.upgrades!, r.id);
  const news = newsFor(state.save, now);
  const crops = r.crops
    .map((crop) => {
      const m = materialsById.get(crop.material)!;
      const tier = unlocks.tiers.find((t) => t.materials.includes(crop.material));
      const season = `${seasonText(crop)}${crop.verified ? '' : ' <span class="tag tag--warn">unverified</span>'}`;
      let action: string;
      const bumper = yieldMultiplier(news, r.id, crop.material) > 1 ? ' <span class="tag">bumper crop this week</span>' : '';
      if (!unlocked.has(crop.material)) action = `<span class="muted small">Unlocks at reputation ${tier?.reputation ?? '?'}</span>`;
      else if (!open) action = `<span class="muted small">Open ${esc(r.name)} under Shop → Regions (${r.unlock.coins} coins)</span>`;
      else if (s.contracts.some((c) => c.region === r.id && c.material === crop.material)) action = `<span class="muted small">Growing now</span>`;
      else if (!inSeason(crop, now)) action = `<span class="muted small">Out of season · next: ${nextSeasonMonth(crop, now)}</span>`;
      else
        action = `<button class="primary" data-action="sign" data-region="${r.id}" data-material="${crop.material}" ${money < crop.cost ? 'disabled' : ''}>Sign · ${crop.cost} coins</button>`;
      return `<div class="crop">
        <p><strong>${esc(m.name)}</strong>${bumper} <span class="muted small">· season ${season} · ${crop.grams} g · ripens in ${duration(crop.growGameHours)}</span></p>
        <div class="row-between"><span></span>${action}</div>
      </div>`;
    })
    .join('');
  return `<li class="card">
    <div><strong>${esc(r.name)}</strong> <span class="muted small">${esc(r.country)} · ships in ${duration(shippingGameHours(r) + shippingDelay(news, r.id))}${open ? '' : ' · closed'}</span>${shippingDelay(news, r.id) ? ' <span class="tag tag--warn">storm delays</span>' : ''}</div>
    <p class="small">${esc(r.quirk)}</p>
    ${crops}
  </li>`;
}

function harvestsTab(now: number): string {
  const s = state.save.sourcing!;
  const contracts = s.contracts
    .map((c) => {
      const region = regions.find((r) => r.id === c.region)!;
      const crop = region.crops.find((x) => x.material === c.material)!;
      const stage = contractStage(c, now);
      let status: string;
      if (stage === 'growing') status = `Ripens in ${timeLeft(c.ripeAt)}`;
      else if (stage === 'best') status = `<strong>Ripe!</strong> Best quality for ${timeLeft(c.bestUntil)}`;
      else if (stage === 'late') status = `Late: quality falling (${qualityWord(harvestQuality(c, now))} now)`;
      else status = `Past its best: ${qualityWord(harvestQuality(c, now))} quality`;
      const methods =
        stage === 'growing'
          ? ''
          : crop.methods
              .map((id) => processes.find((p) => p.id === id)!)
              .map((p) => {
                const stats = processStats(state.save.upgrades!, p.id);
                return `<button class="chip" data-action="harvest" data-id="${esc(c.id)}" data-method="${p.id}" ${!stats.owned || state.save.customers!.money < p.cost ? 'disabled' : ''}>
                  ${esc(p.name)} · ${p.cost} coins · ${duration(stats.gameHours)}${stats.owned ? '' : ' · buy under Shop → Processing'}
                </button>`;
              })
              .join('');
      const about =
        stage === 'growing'
          ? ''
          : `<p class="muted small">${crop.methods.map((id) => processes.find((p) => p.id === id)!).map((p) => `${esc(p.name)}: ${esc(p.about)}`).join('<br>')}</p>`;
      return `<li class="card"><div><strong>${esc(name(c.material))}</strong> <span class="muted small">${esc(region.name)}</span></div>
        <p class="small">${status}</p>${about}<div class="chips">${methods}</div></li>`;
    })
    .join('');
  const batches = s.batches
    .map((b) => {
      const p = processes.find((x) => x.id === b.method)!;
      return `<li class="card"><div><strong>${esc(name(b.material))}</strong> <span class="muted small">${esc(p.name)} → ${esc(p.output)}</span></div>
        <p class="small">Ready in ${timeLeft(b.readyAt)} · ${b.grams} g · ${qualityWord(b.quality)}</p></li>`;
    })
    .join('');
  const shipments = s.shipments
    .map(
      (x) => `<li class="card"><div><strong>${x.items.map((i) => esc(name(i.material))).join(', ')}</strong> <span class="muted small">from ${esc(x.from)}</span></div>
        <p class="small">On its way · arrives in ${timeLeft(x.arrivesAt)}</p></li>`,
    )
    .join('');
  const empty = !contracts && !batches && !shipments ? '<p class="muted">Nothing on the go. Sign a harvest on the map, or order from the supplier.</p>' : '';
  return `${empty}
    ${contracts ? `<h2>Growing</h2><ul class="list cards">${contracts}</ul>` : ''}
    ${batches ? `<h2>Processing</h2><ul class="list cards">${batches}</ul>` : ''}
    ${shipments ? `<h2>Shipping</h2><ul class="list cards">${shipments}</ul>` : ''}`;
}

function supplierTab(): string {
  const unlocked = unlockedMaterialIds(state.save.customers!.reputation);
  const money = state.save.customers!.money;
  const sup = sourcing.supplier;
  const rows = [...unlocked]
    .map((id) => materialsById.get(id)!)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((m) => {
      const multiplier = priceMultiplier(newsFor(state.save, nowGame()), m.id);
      const price = priceOf(m.id, multiplier);
      const deal = multiplier < 1 ? ' <span class="tag">on offer</span>' : multiplier > 1 ? ' <span class="tag tag--warn">prices up</span>' : '';
      const kind = m.type === 'natural' ? `broker stock · ${qualityWord(sup.brokerQuality)} quality` : 'catalogue';
      return `<li class="card"><div class="row-between"><div><strong>${esc(m.name)}</strong>${deal}<br><span class="muted small">${sup.lotGrams} g · ${kind}</span></div>
        <button class="primary" data-action="order" data-material="${m.id}" ${money < price ? 'disabled' : ''}>${price} coins</button></div></li>`;
    })
    .join('');
  return `<p class="muted small">${esc(sup.name)}: aroma chemicals from the catalogue, and naturals from a broker's stock all year round (at a premium and of ${qualityWord(sup.brokerQuality)} quality; harvest them yourself for better). Orders ship in ${duration(sup.shippingGameHours)}.</p>
    <ul class="list cards">${rows}</ul>`;
}

function stockTab(now: number): string {
  const s = state.save.sourcing!;
  const materials = [...new Set(s.inventory.map((l) => l.material))].sort((a, b) => name(a).localeCompare(name(b)));
  if (materials.length === 0) return '<p class="muted">The shelves are bare. Unpack crates to fill them.</p>';
  const rows = materials
    .map((id) => {
      const ages = sourcing.aging[id] ? ' · improving with age' : '';
      const grams = stockOf(s, id);
      return `<li class="card"><div class="row-between"><strong>${esc(name(id))}</strong><span>${grams >= 10 ? Math.round(grams) : grams.toFixed(1)} g</span></div>
        <p class="muted small">${qualityWord(stockQuality(s, id, now))} quality${ages}</p></li>`;
    })
    .join('');
  return `<p class="muted small">Each perfume uses ${sourcing.perfumeGrams} g of material in total, shared by its formula.</p><ul class="list cards">${rows}</ul>`;
}
