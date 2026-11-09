import { content, materialsById } from '../game/content';
import { radarOf, SPOKES, type Mix, type RoundScore, type Target, type Values } from '../game/radar';
import { cardFor, counter, intensityWord, maxLevel } from '../game/round';
import { radarData, spokeInfo } from '../game/radar';
import type { Spoke } from '../game/types';
import { ownedMaterials } from '../game/world';
import { state } from '../state';
import { esc } from './html';
import { radarChart, scaleFor, type RadarLayer } from './radar';

// The counter: a customer round (brief, timer, drops, test pings, hand over) and its reveal.

export interface Reveal {
  name: string;
  mix: Mix;
  /** Each stage (one, or opening and drydown): what you made and what they wanted. */
  stages: { name: string; values: Values; target: Values }[];
  score: RoundScore;
  cause: string | null;
  pay: number;
  tip: number;
  /** Why they tipped (the time tier's words). */
  tipText?: string | null;
  accords: string[];
  page: string | null;
  thanks: string | null;
  /** Materials that levelled up from this perfume. */
  levelUps: { id: string; level: number }[];
}

/** A test ping on screen: what it showed, for how long, and when it started. */
export interface Ping {
  /** The mix at each of the brief's stages (one for the bench and simple briefs). */
  values: Values[];
  ms: number;
  at: number;
}

export const targetValues = (t: Target): Values => Object.fromEntries(SPOKES.map((s) => [s, t.shape[s] * t.intensity])) as Values;

export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Materials you can use at the counter, sorted by family then name. */
function counterMaterials() {
  const owned = ownedMaterials(state.save);
  const order = new Map(content.families.map((f, i) => [f.id, i]));
  return content.materials.filter((m) => owned.has(m.id)).sort((a, b) => (order.get(a.family) ?? 0) - (order.get(b.family) ?? 0) || a.name.localeCompare(b.name));
}

const asset = (path: string): string => `${import.meta.env.BASE_URL}${path}`;

/** The last tile tapped, so the freshly drawn tile can bounce. */
let lastDrop: { id: string; at: number } | null = null;
export function noteDrop(id: string): void {
  lastDrop = { id, at: Date.now() };
}

/** A material's bottle: plain until its card shows its direction, then that spoke's colour. */
export function bottleIcon(id: string): string {
  const card = cardFor(id, state.save.counter!.exp[id] ?? 0);
  return asset(card.direction ? spokeInfo(card.direction).icon : counter.ui.unknownIcon);
}

/** A tile's small print: its card level and, once known, its main direction. */
function tileInfo(id: string): string {
  const card = cardFor(id, state.save.counter!.exp[id] ?? 0);
  const level = card.level >= maxLevel() ? 'Lv max' : `Lv ${card.level}`;
  return card.direction ? `${level} · ${spokeInfo(card.direction).name}` : `${level} · ?`;
}

/** The materials as bottle tiles: tap to add a drop; the badge counts drops and − takes one out. */
export function dropTiles(mix: Mix): string {
  const popping = lastDrop && Date.now() - lastDrop.at < counter.ui.popMs ? lastDrop.id : null;
  return counterMaterials()
    .map((m) => {
      const n = mix[m.id] ?? 0;
      const id = esc(m.id);
      return `<li class="tile${n ? ' tile--on' : ''}${popping === m.id ? ' tile--pop' : ''}">
        <button class="tile-add" data-action="drop" data-id="${id}" data-value="1" aria-label="One drop of ${esc(m.name)}">
          <img class="tile-icon" src="${bottleIcon(m.id)}" alt="">
          <span class="tile-name">${esc(m.name)}</span>
          <span class="tile-info">${esc(tileInfo(m.id))}</span>
        </button>
        ${n ? `<span class="tile-badge" aria-label="${n} drops">${n}</span><button class="tile-minus" data-action="drop" data-id="${id}" data-value="-1" aria-label="One drop less">−</button>` : ''}
      </li>`;
    })
    .join('');
}

/** The reward when a mix first hits an accord: big, and saved to the accord book. */
export function accordReward(id: string): string {
  const a = content.accords.find((x) => x.id === id);
  if (!a) return '';
  return `<div class="accord-reward" role="status">
    <p class="accord-reward-kicker">New accord discovered</p>
    <p class="accord-reward-name">${esc(a.name)}</p>
    <p class="small">${esc(a.description)}</p>
    <p class="muted small">Saved to your accord book.</p>
    <button class="primary" data-action="dismiss-reward">Wonderful</button>
  </div>`;
}

/** The spokes an accord pushes, to light up while its reward shows. */
function pulseFor(reward: string | null): Spoke[] {
  return reward ? (Object.keys(radarData.accords.find((a) => a.accord === reward)?.spokes ?? {}) as Spoke[]) : [];
}

export function pingLayer(ping: Ping | null, stage = 0): RadarLayer[] {
  if (!ping || !ping.values[stage]) return [];
  const elapsed = Date.now() - ping.at;
  if (stage > 0) return elapsed < ping.ms ? [{ kind: 'ping', values: ping.values[stage], ms: ping.ms, elapsed }] : [];
  return elapsed < ping.ms ? [{ kind: 'ping', values: ping.values[0], ms: ping.ms, elapsed }] : [];
}

export function roundScreen(ping: Ping | null, reward: string | null): string {
  const round = state.save.counter!.round!;
  const visit = state.save.customers!.visits.find((v) => v.id === round.visitId);
  const b = round.brief;
  const elapsed = Date.now() - round.startedAt;
  const stages = b.stages ?? [{ id: '', name: '', hours: 0, target: b.target }];
  const charts = stages
    .map((st, i) => {
      const target = targetValues(st.target);
      const layers: RadarLayer[] = [...(b.ghost.length ? [{ kind: 'ghost' as const, values: target, spokes: b.ghost }] : []), ...pingLayer(ping, i)];
      return `<figure class="radar-stage">${st.name ? `<figcaption class="small"><strong>${esc(st.name)}</strong> · ${esc(intensityWord(st.target.intensity))}</figcaption>` : ''}${radarChart(layers, scaleFor(target), pulseFor(reward))}</figure>`;
    })
    .join('');
  const used = Object.values(round.drops).reduce((a, n) => a + n, 0);
  const lastPing = ping ? radarOf(round.drops) : null;
  const muddy = lastPing?.muddy.length ? '<p class="small warn-text">It went muddy: something in the mix is fighting.</p>' : '';
  return `<header class="bar-top">
      <button class="link" data-action="close-panel">Later</button>
      <h1>${esc(visit?.name ?? 'The counter')}</h1>
      <span class="round-timer" data-timer="${round.startedAt}">${clock(elapsed)}</span>
    </header>
    <main class="customer round">
      ${reward ? accordReward(reward) : ''}
      <div class="bubble"><p class="bubble-text">“${esc(b.text)}”</p>${b.extra.map((h) => `<p class="bubble-hint">“${esc(h)}”</p>`).join('')}</div>
      <p class="small">They want it <strong>${esc(intensityWord(b.target.intensity))}</strong>${stages.length > 1 ? ' at first, and it should change as it dries down' : ''}.${b.ghost.length ? ' The dashed lines are part of what they described.' : ''}</p>
      <div class="radar-box${stages.length > 1 ? ' radar-box--stages' : ''}">${charts}</div>
      ${muddy}
      <p class="muted small">Tap a bottle for a drop. Test shows your mix for a moment, and each test fades faster.</p>
      <ul class="tiles">${dropTiles(round.drops)}</ul>
      <div class="action-bar">
        <button class="chip" data-action="round-test" ${used ? '' : 'disabled'}>Test${round.tests ? ` (${round.tests})` : ''}</button>
        <button class="link danger" data-action="round-clear" ${used ? '' : 'disabled'}>Pour out</button>
        <button class="primary" data-action="round-hand-over" ${used ? '' : 'disabled'}>Hand over${used ? ` · ${used}` : ''}</button>
      </div>
    </main>`;
}

/** A stage's main spokes, strongest first (one or two). */
function mainSpokes(v: Values): Spoke[] {
  const total = SPOKES.reduce((a, s) => a + v[s], 0) || 1;
  return [...SPOKES].sort((a, b) => v[b] - v[a]).filter((s, i) => i === 0 || v[s] / total >= 0.18).slice(0, 2);
}

const inWords = (spokes: Spoke[]) => spokes.map((s) => spokeInfo(s).word).join(' and ');

/** How strong it came out next to what they wanted, in words. */
function strengthWords(v: Values, t: Values): string {
  const ratio = SPOKES.reduce((a, s) => a + v[s], 0) / (SPOKES.reduce((a, s) => a + t[s], 0) || 1);
  if (ratio > 1.7) return 'far too strong';
  if (ratio > 1.25) return 'a little strong';
  if (ratio < 0.6) return 'far too faint';
  if (ratio < 0.8) return 'a little faint';
  return 'at just the right strength';
}

/** What they smelled, in words, stage by stage: no chart, just a description. */
function description(r: Reveal): string {
  return r.stages
    .map((st) => {
      const made = mainSpokes(st.values);
      const wanted = mainSpokes(st.target);
      const same = made.length === wanted.length && made.every((s) => wanted.includes(s));
      const when = st.name ? `${st.name}: ` : '';
      const shape = same ? `it smelled ${inWords(wanted)}, as they pictured` : `it smelled ${inWords(made)}, where they'd pictured something ${inWords(wanted)}`;
      return `<p>${esc(when)}${esc(when ? shape : shape.charAt(0).toUpperCase() + shape.slice(1))}, ${esc(strengthWords(st.values, st.target))}.</p>`;
    })
    .join('');
}

/** The stars, popping in one after another; a sparkle turns behind a three-star perfume. */
function revealStars(stars: number): string {
  const ui = counter.ui;
  const imgs = [0, 1, 2].map((i) => `<img class="star-pop" style="animation-delay:${0.25 + i * 0.35}s" src="${asset(i < stars ? ui.star : ui.starEmpty)}" alt="">`).join('');
  return `<div class="reveal-stars${stars === 3 ? ' reveal-stars--best' : ''}" role="img" aria-label="${stars} of 3 stars">${stars === 3 ? `<img class="reveal-sparkle" src="${asset(ui.sparkle)}" alt="">` : ''}${imgs}</div>`;
}

export function revealScreen(r: Reveal): string {
  const accords = r.accords
    .map((id) => content.accords.find((a) => a.id === id)?.name)
    .filter(Boolean)
    .join(', ');
  const used = Object.entries(r.mix)
    .map(([id, n]) => `${materialsById.get(id)?.name ?? id} ×${n}`)
    .join(' · ');
  const total = r.pay + r.tip;
  const levelUps = r.levelUps
    .map((u, i) => `<li class="levelup" style="animation-delay:${1.4 + i * 0.25}s"><img src="${bottleIcon(u.id)}" alt=""><span>${levelUpLine(u.id, u.level)}</span></li>`)
    .join('');
  return `<header class="bar-top"><span></span><h1>The reveal</h1><span></span></header>
    <main class="customer reveal">
      <p class="muted small">${esc(r.name)} tries it on…</p>
      ${revealStars(r.score.stars)}
      <div class="reveal-description">${description(r)}</div>
      <p class="reveal-cause">${esc(r.cause ?? 'Nothing to change: that’s exactly it.')}</p>
      ${total ? `<p class="reveal-pay"><img class="coin" src="${asset(counter.ui.coin)}" alt=""><strong>+${total}</strong></p>` : ''}
      <p class="small">${r.pay ? `They pay <strong>${r.pay} coins</strong>${r.tip ? ` and tip <strong>${r.tip}</strong>${r.tipText ? ` ${esc(r.tipText)}` : ''}` : ''}.` : 'It isn’t what they came for, so they won’t pay for it.'}</p>
      ${accords ? `<p class="small">Accords in it: <strong>${esc(accords)}</strong></p>` : ''}
      ${r.thanks ? `<p>“${esc(r.thanks)}”</p>` : ''}
      ${r.page ? `<p class="banner small"><span>You've recovered a page of her book.</span></p>` : ''}
      ${levelUps ? `<ul class="plain levelups">${levelUps}</ul>` : ''}
      <p class="muted small">You used ${esc(used)}.</p>
      <div class="row-between"><span></span><button class="primary" data-action="reveal-done">Thank ${esc(r.name)}</button></div>
    </main>`;
}

/** A material's card, as much as its EXP has revealed. */
export function cardLine(id: string): string {
  const exp = state.save.counter!.exp[id] ?? 0;
  const card = cardFor(id, exp);
  const levels = counter.exp.levels;
  const next = levels[card.level];
  const progress = next !== undefined ? ` · ${exp}/${next} EXP` : '';
  const label = card.level >= maxLevel() ? 'Level max' : `Level ${card.level}`;
  let what: string;
  if (card.vector) {
    const parts = Object.entries(card.vector)
      .sort((a, b) => b[1] - a[1])
      .map(([s, v]) => `${spokeInfo(s as never).name} ${Math.round(v * 100)}`)
      .join(' · ');
    what = `${parts} · ${card.volatility}`;
  } else if (card.strength) what = `${spokeInfo(card.direction!).name}, ${card.strength}`;
  else if (card.direction) what = `pushes ${spokeInfo(card.direction).name}`;
  else what = 'direction unknown (?)';
  return `<span class="material-card small">${label}: ${esc(what)}<span class="muted">${progress}</span></span>`;
}

/** What a level-up taught you, for the reveal. */
export function levelUpLine(id: string, level: number): string {
  const name = esc(materialsById.get(id)?.name ?? id);
  if (level >= maxLevel()) return `<strong>${name}</strong> is at its top level: its card shows its exact pull and how long it lasts.`;
  if (level >= 3) return `<strong>${name}</strong> reached level ${level}: you know how strongly it pushes.`;
  return `<strong>${name}</strong> reached level ${level}: you know its main direction.`;
}

/** The test bench: the same radar, drops and tests as a round, with no customer, timer or money. */
export function benchScreen(ping: Ping | null, reward: string | null): string {
  const bench = state.save.counter!.bench;
  const used = Object.values(bench.drops).reduce((a, n) => a + n, 0);
  const shown = ping ? radarOf(bench.drops) : null;
  const scale = shown ? Math.max(1, ...SPOKES.map((s) => shown.values[s])) * 1.3 : 1; // no target: fit the mix
  const found = shown?.accords.map((id) => content.accords.find((a) => a.id === id)?.name).filter(Boolean) ?? [];
  return `<header class="bar-top">
      <button class="link" data-action="close-panel">Close</button>
      <h1>Test bench</h1>
      <span></span>
    </header>
    <main class="customer round">
      ${reward ? accordReward(reward) : ''}
      <p class="muted small">Try anything: no customer, no timer, no money. Find accords and get a feel for each material. Only perfumes you serve earn EXP.</p>
      <div class="radar-box">${radarChart(pingLayer(ping), scale, pulseFor(reward))}</div>
      ${shown?.muddy.length ? '<p class="small warn-text">It went muddy: something in the mix is fighting.</p>' : ''}
      ${found.length ? `<p class="small">Accords in it: <strong>${esc(found.join(', '))}</strong></p>` : ''}
      <p class="muted small">Tap a bottle for a drop. Each test fades faster than the last; pouring it out starts afresh.</p>
      <ul class="tiles">${dropTiles(bench.drops)}</ul>
      <div class="action-bar">
        <button class="chip" data-action="round-test" ${used ? '' : 'disabled'}>Test${bench.tests ? ` (${bench.tests})` : ''}</button>
        <button class="link danger" data-action="round-clear" ${used ? '' : 'disabled'}>Pour out${used ? ` · ${used}` : ''}</button>
      </div>
    </main>`;
}

