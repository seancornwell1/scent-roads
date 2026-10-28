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
import { unlocks } from '../game/unlocks';
import { processStats } from '../game/upgrades';
import { CHEMIST, chapterInfo, inTransit, routeById, routeOpen, unreadLetters, type Letter } from '../game/routes';
import { newsFor, ownedMaterials } from '../game/world';
import { DILUTIONS } from '../game/blend';
import { lab } from '../game/lab';
import { DILUTION_BATCH_GRAMS } from '../game/sourcing';
import { currentRank, nowGame, state } from '../state';
import { esc, starsText } from './html';

// The back room: crates that have arrived, letters from her supply network, the sourcing
// map, harvests in progress, the supplier, and the stock room. Times show as real time
// left at the current speed.

export type BackroomTab = 'letters' | 'map' | 'harvests' | 'supplier' | 'stock' | 'lab';
const TABS: { id: BackroomTab; label: string }[] = [
  { id: 'letters', label: 'Letters' },
  { id: 'map', label: 'Map' },
  { id: 'harvests', label: 'Harvests' },
  { id: 'supplier', label: 'Supplier' },
  { id: 'stock', label: 'Stock' },
  { id: 'lab', label: 'Lab' },
];
const SPEEDS = [1, 60, 600];
const SHORT_MONTHS = MONTH_NAMES.map((m) => m.slice(0, 3));

export function backroomScreen(): string {
  const { ui, save } = state;
  const s = save.sourcing!;
  const now = nowGame();
  const date = dateAt(now, sourcing.calendarStart);
  const tab = ui.backroomTab;
  const unread = unreadLetters(save.routes!);
  const count = (id: BackroomTab) =>
    id === 'harvests' && s.contracts.length + s.batches.length + s.shipments.length > 0 ? ` · ${s.contracts.length + s.batches.length + s.shipments.length}` : id === 'letters' && unread > 0 ? ` · ${unread}` : '';
  const tabs = TABS.map((t) => `<button class="tab-chip ${t.id === tab ? 'on' : ''}" data-action="backroom-tab" data-value="${t.id}">${t.label}${count(t.id)}</button>`).join('');
  const body = tab === 'letters' ? lettersTab() : tab === 'map' ? mapTab(now) : tab === 'harvests' ? harvestsTab(now) : tab === 'supplier' ? supplierTab() : tab === 'lab' ? labTab() : stockTab(now);
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
  if (h >= 48) return `${Math.floor(h / 24)} days${h % 24 ? ` ${h % 24} h` : ''}`;
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

function nextSeasonMonth(crop: Crop, now: number): string {
  for (let d = 1; d <= 366; d++) {
    const t = now + d * 24;
    if (inSeason(crop, t)) return MONTH_NAMES[dateAt(t, sourcing.calendarStart).month - 1];
  }
  return '';
}

function letterCard(l: Letter, action = ''): string {
  const route = routeById(l.route);
  const kind = l.kind === 'first' ? 'wrote to the shop' : l.kind === 'reply' ? 'wrote back' : 'sent a note with a crate';
  return `<li class="card letter-card">
    <div><strong>${esc(route?.from ?? l.route)}</strong> <span class="muted small">${kind}${l.read ? '' : ' <span class="tag">new</span>'}</span></div>
    ${l.kind === 'first' && route ? `<p class="muted small">${esc(route.about)}</p>` : ''}
    <div class="letter">${l.body.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    ${action}
  </li>`;
}

function lettersTab(): string {
  const r = state.save.routes!;
  const chapter = chapterInfo(r.chapter, sourcing.calendarStart);
  const transit = inTransit(r);
  const waiting = r.letters.filter((l) => l.kind === 'first' && r.routes[l.route]?.status === 'waiting');
  const waitingCards = waiting
    .map((l) => {
      const route = routeById(l.route);
      const button = transit
        ? `<p class="muted small">You can write back once ${esc(routeById(transit)?.from ?? '')} has answered.</p>`
        : `<div class="row-between"><span class="muted small">${l.route === CHEMIST ? 'Reopens the catalogue of aroma chemicals' : `Reopens the route to ${esc(regions.find((x) => x.id === l.route)?.name ?? l.route)}`}</span><button class="primary" data-action="answer-letter" data-id="${esc(l.route)}">Write back</button></div>`;
      return route ? letterCard(l, button) : '';
    })
    .join('');
  const transitCard = transit
    ? `<li class="card"><p class="small">Your letter to <strong>${esc(routeById(transit)?.from ?? transit)}</strong> is on its way. Their answer should come in ${timeLeft(r.routes[transit].opensAt!)}.</p></li>`
    : '';
  const others = r.letters
    .filter((l) => !(l.kind === 'first' && r.routes[l.route]?.status === 'waiting'))
    .slice()
    .reverse()
    .map((l) => letterCard(l))
    .join('');
  return `<p class="muted small"><strong>Chapter ${r.chapter + 1} · ${esc(chapter.title)}.</strong> Her growers and her chemist went quiet when she died. Write back to reopen a route, one letter at a time; new letters come with the seasons.</p>
    ${transitCard ? `<ul class="list cards">${transitCard}</ul>` : ''}
    ${waitingCards ? `<h2>Waiting for your answer</h2><ul class="list cards">${waitingCards}</ul>` : ''}
    <h2>Letters</h2>
    <ul class="list cards">${others || '<li class="muted">Nothing yet. Answered letters, and notes that come with crates, are kept here.</li>'}</ul>`;
}

function mapTab(now: number): string {
  const unlocked = ownedMaterials(state.save);
  const cards = regions.map((r) => regionCard(r, now, unlocked)).join('');
  return `<div class="placeholder placeholder--map">Placeholder: painted world map</div>
    <p class="muted small">Sign a harvest contract while a crop is in season. It ripens over real time; collect it inside its best window for top quality.</p>
    <ul class="list cards">${cards}</ul>`;
}

function regionCard(r: Region, now: number, unlocked: Set<string>): string {
  const s = state.save.sourcing!;
  const money = state.save.customers!.money;
  const routes = state.save.routes!;
  const open = routeOpen(routes, r.id);
  const grower = routeById(r.id);
  const status = routes.routes[r.id]?.status;
  const closedWhy =
    status === 'waiting'
      ? `${grower?.from ?? 'The grower'} has written: answer under Letters to reopen this route`
      : status === 'replied'
        ? `Your letter to ${grower?.from ?? 'the grower'} is on its way`
        : `${grower?.from ?? 'The grower'} hasn't written yet`;
  const news = newsFor(state.save, now);
  const crops = r.crops
    .map((crop) => {
      const m = materialsById.get(crop.material)!;
      const tier = unlocks.tiers.find((t) => t.materials.includes(crop.material));
      const season = `${seasonText(crop)}${crop.verified ? '' : ' <span class="tag tag--warn">unverified</span>'}`;
      let action: string;
      const bumper = yieldMultiplier(news, r.id, crop.material) > 1 ? ' <span class="tag">bumper crop this week</span>' : '';
      if (!unlocked.has(crop.material)) action = `<span class="muted small">Unlocks at reputation ${tier?.reputation ?? '?'}</span>`;
      else if (!open) action = `<span class="muted small">${esc(closedWhy)}</span>`;
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
    <div><strong>${esc(r.name)}</strong> <span class="muted small">${esc(r.country)} · ships in ${duration(shippingGameHours(r) + shippingDelay(news, r.id))}${open ? '' : ' · route closed'}</span>${shippingDelay(news, r.id) ? ' <span class="tag tag--warn">storm delays</span>' : ''}</div>
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
  const empty = !contracts && !batches && !shipments ? '<p class="muted">Nothing on the go. Sign a harvest on the map, or order from the apothecary or the chemist.</p>' : '';
  return `${empty}
    ${contracts ? `<h2>Growing</h2><ul class="list cards">${contracts}</ul>` : ''}
    ${batches ? `<h2>Processing</h2><ul class="list cards">${batches}</ul>` : ''}
    ${shipments ? `<h2>Shipping</h2><ul class="list cards">${shipments}</ul>` : ''}`;
}

function supplierTab(): string {
  const unlocked = ownedMaterials(state.save);
  const money = state.save.customers!.money;
  const sup = sourcing.supplier;
  const chemistOpen = routeOpen(state.save.routes!, CHEMIST);
  const row = (id: string, kind: string, closed: boolean) => {
    const m = materialsById.get(id)!;
    const multiplier = priceMultiplier(newsFor(state.save, nowGame()), m.id);
    const price = priceOf(m.id, multiplier);
    const deal = multiplier < 1 ? ' <span class="tag">on offer</span>' : multiplier > 1 ? ' <span class="tag tag--warn">prices up</span>' : '';
    return `<li class="card"><div class="row-between"><div><strong>${esc(m.name)}</strong>${deal}<br><span class="muted small">${sup.lotGrams} g · ${kind}</span></div>
      <button class="primary" data-action="order" data-material="${m.id}" ${closed || money < price ? 'disabled' : ''}>${price} coins</button></div></li>`;
  };
  const owned = [...unlocked].map((id) => materialsById.get(id)!).sort((a, b) => a.name.localeCompare(b.name));
  const naturals = owned.filter((m) => m.type === 'natural').map((m) => row(m.id, `broker stock · ${qualityWord(sup.brokerQuality)} quality`, false)).join('');
  const synthetics = owned.filter((m) => m.type === 'synthetic').map((m) => row(m.id, 'catalogue', !chemistOpen)).join('');
  const status = routeOpen(state.save.routes!, CHEMIST)
    ? `Orders come by train in ${duration(sup.chemistShippingGameHours)}, with a note from Paul Varenne.`
    : state.save.routes!.routes[CHEMIST]?.status === 'replied'
      ? 'Your letter is on its way; you can order once they write back.'
      : 'Closed until you answer their letter (Letters).';
  return `<h2>${esc(sup.name)}</h2>
    <p class="muted small">Naturals from a broker's stock all year round, at a premium and of ${qualityWord(sup.brokerQuality)} quality. Harvest them yourself for better. Ready in ${duration(sup.shippingGameHours)}.</p>
    <ul class="list cards">${naturals || '<li class="muted">No naturals unlocked.</li>'}</ul>
    <h2>${esc(sup.chemistName)}</h2>
    <p class="muted small">Her old chemist: aroma chemicals from the catalogue. ${status}</p>
    <ul class="list cards">${synthetics || '<li class="muted">No aroma chemicals unlocked yet.</li>'}</ul>`;
}

function stockTab(now: number): string {
  const s = state.save.sourcing!;
  const materials = [...new Set(s.inventory.map((l) => l.material))].sort((a, b) => name(a).localeCompare(name(b)));
  if (materials.length === 0) return '<p class="muted">The shelves are bare. Unpack crates to fill them.</p>';
  const canDilute = currentRank().dilutions;
  const g = (x: number) => `${x >= 10 ? Math.round(x) : x.toFixed(1)} g`;
  const rows = materials
    .map((id) => {
      const ages = sourcing.aging[id] ? ' · improving with age' : '';
      const lots = DILUTIONS.filter((d) => stockOf(s, id, d) > 0)
        .map((d) => `${g(stockOf(s, id, d))} ${d === 100 ? 'neat' : `at ${d}%`} · ${qualityWord(stockQuality(s, id, now, d))} quality`)
        .join('<br>');
      const neat = stockOf(s, id, 100);
      const dilute = canDilute
        ? `<div class="chips">${([10, 1] as const)
            .map((d) => `<button class="chip" data-action="dilute" data-id="${esc(id)}" data-value="${d}" ${neat + 1e-9 < (DILUTION_BATCH_GRAMS * d) / 100 ? 'disabled' : ''}>Make ${DILUTION_BATCH_GRAMS} g at ${d}%</button>`)
            .join('')}</div>`
        : '';
      return `<li class="card"><div><strong>${esc(name(id))}</strong></div>
        <p class="muted small">${lots}${ages}</p>${dilute}</li>`;
    })
    .join('');
  const help = canDilute
    ? `Each perfume uses ${sourcing.perfumeGrams} g of material in total, shared by its formula. A dilution is made with odourless solvent: ${DILUTION_BATCH_GRAMS} g at 10% takes 1 g of the neat material, at 1% only a tenth of a gram.`
    : `Each perfume uses ${sourcing.perfumeGrams} g of material in total, shared by its formula. Junior perfumers can make dilutions here.`;
  return `<p class="muted small">${help}</p><ul class="list cards">${rows}</ul>`;
}

/** The analysis lab and its reconstruction challenges. */
function labTab(): string {
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
