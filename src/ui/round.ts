import { content, materialsById } from '../game/content';
import { radarOf, SPOKES, type Mix, type RoundScore, type Target, type Values } from '../game/radar';
import { cardFor, counter, intensityWord, maxLevel } from '../game/round';
import { radarData, spokeInfo } from '../game/radar';
import type { Spoke } from '../game/types';
import { ownedMaterials } from '../game/world';
import { state } from '../state';
import { esc, starsText } from './html';
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

/** The material rows: name, family, and drops with − and +. */
export function dropRows(mix: Mix, card: (id: string) => string): string {
  return counterMaterials()
    .map((m) => {
      const n = mix[m.id] ?? 0;
      return `<li class="drop-row${n ? ' drop-row--on' : ''}">
        <div class="drop-name"><strong>${esc(m.name)}</strong> <span class="muted small">${esc(m.family)}</span>${card(m.id)}</div>
        <div class="drop-count">
          <button class="chip" data-action="drop" data-id="${esc(m.id)}" data-value="-1" ${n ? '' : 'disabled'} aria-label="One drop less">−</button>
          <strong>${n}</strong>
          <button class="chip" data-action="drop" data-id="${esc(m.id)}" data-value="1" aria-label="One drop more">+</button>
        </div>
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

export function roundScreen(ping: Ping | null, reward: string | null, card: (id: string) => string): string {
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
      <blockquote class="memory">“${esc(b.text)}”</blockquote>
      ${b.extra.map((h) => `<p class="hint">“${esc(h)}”</p>`).join('')}
      <p class="small">They want it <strong>${esc(intensityWord(b.target.intensity))}</strong>${stages.length > 1 ? ' at first, and it should change as it dries down' : ''}.${b.ghost.length ? ' The dashed lines are part of what they described.' : ''}</p>
      <div class="radar-box${stages.length > 1 ? ' radar-box--stages' : ''}">${charts}</div>
      ${muddy}
      <div class="row-between">
        <button class="chip" data-action="round-test" ${used ? '' : 'disabled'}>Test${round.tests ? ` (${round.tests})` : ''}</button>
        <button class="link danger" data-action="round-clear" ${used ? '' : 'disabled'}>Pour it out</button>
        <button class="primary" data-action="round-hand-over" ${used ? '' : 'disabled'}>Hand over</button>
      </div>
      <p class="muted small">Each test shows your mix for a moment; every test fades faster than the last. ${used} drop${used === 1 ? '' : 's'} in the bottle.</p>
      <ul class="list drops">${dropRows(round.drops, card)}</ul>
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

export function revealScreen(r: Reveal, gains: string[]): string {
  const accords = r.accords
    .map((id) => content.accords.find((a) => a.id === id)?.name)
    .filter(Boolean)
    .join(', ');
  const used = Object.entries(r.mix)
    .map(([id, n]) => `${materialsById.get(id)?.name ?? id} ×${n}`)
    .join(' · ');
  return `<header class="bar-top"><span></span><h1>The reveal</h1><span></span></header>
    <main class="customer reveal">
      <p class="muted small">${esc(r.name)} tries it on…</p>
      <p class="stars" aria-label="${r.score.stars} of 3 stars">${starsText(r.score.stars)}</p>
      <div class="reveal-description">${description(r)}</div>
      <p class="reveal-cause">${esc(r.cause ?? 'Nothing to change: that’s exactly it.')}</p>
      ${accords ? `<p class="small">Accords in it: <strong>${esc(accords)}</strong></p>` : ''}
      <p class="muted small">You used ${esc(used)}.</p>
      ${r.thanks ? `<p>“${esc(r.thanks)}”</p>` : ''}
      ${r.page ? `<p class="banner small"><span>You've recovered a page of her book.</span></p>` : ''}
      <p>${r.pay ? `They pay <strong>${r.pay} coins</strong>${r.tip ? ` and tip <strong>${r.tip}</strong>${r.tipText ? ` ${esc(r.tipText)}` : ''}` : ''}.` : 'It isn’t what they came for, so they won’t pay for it.'}</p>
      ${gains.length ? `<ul class="plain small exp-gains">${gains.map((g) => `<li>${g}</li>`).join('')}</ul>` : ''}
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
      <div class="row-between">
        <button class="chip" data-action="round-test" ${used ? '' : 'disabled'}>Test${bench.tests ? ` (${bench.tests})` : ''}</button>
        <button class="link danger" data-action="round-clear" ${used ? '' : 'disabled'}>Pour it out</button>
      </div>
      <p class="muted small">${used} drop${used === 1 ? '' : 's'} in the bottle. Each test fades faster than the last; pouring it out starts afresh.</p>
      <ul class="list drops">${dropRows(bench.drops, cardLine)}</ul>
    </main>`;
}

