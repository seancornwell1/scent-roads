import { content, materialsById } from '../game/content';
import { radarOf, SPOKES, type Mix, type RoundScore, type Target, type Values } from '../game/radar';
import { cardFor, counter, intensityWord, maxLevel, tipFor } from '../game/round';
import { spokeInfo } from '../game/radar';
import { ownedMaterials } from '../game/world';
import { state } from '../state';
import { esc, starsText } from './html';
import { radarChart, scaleFor, type RadarLayer } from './radar';

// The counter: a customer round (brief, timer, drops, test pings, hand over) and its reveal.

export interface Reveal {
  name: string;
  mix: Mix;
  values: Values;
  target: Values;
  score: RoundScore;
  cause: string | null;
  pay: number;
  tip: number;
  accords: string[];
  page: string | null;
  thanks: string | null;
  /** Materials that levelled up from this perfume. */
  levelUps: { id: string; level: number }[];
}

/** A test ping on screen: what it showed, for how long, and when it started. */
export interface Ping {
  values: Values;
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

export function pingLayer(ping: Ping | null): RadarLayer[] {
  if (!ping) return [];
  const elapsed = Date.now() - ping.at;
  return elapsed < ping.ms ? [{ kind: 'ping', values: ping.values, ms: ping.ms, elapsed }] : [];
}

export function roundScreen(ping: Ping | null, reward: string | null, card: (id: string) => string): string {
  const round = state.save.counter!.round!;
  const visit = state.save.customers!.visits.find((v) => v.id === round.visitId);
  const b = round.brief;
  const target = targetValues(b.target);
  const elapsed = Date.now() - round.startedAt;
  const layers: RadarLayer[] = [...(b.ghost.length ? [{ kind: 'ghost' as const, values: target, spokes: b.ghost }] : []), ...pingLayer(ping)];
  const used = Object.values(round.drops).reduce((a, n) => a + n, 0);
  const lastPing = ping ? radarOf(round.drops) : null;
  const muddy = lastPing?.muddy.length ? '<p class="small warn-text">It went muddy: something in the mix is fighting.</p>' : '';
  return `<header class="bar-top">
      <button class="link" data-action="close-panel">Later</button>
      <h1>${esc(visit?.name ?? 'The counter')}</h1>
      <span class="round-timer" data-timer="${round.startedAt}" data-pay="${b.pay}">${clock(elapsed)} · tip ${tipFor(b.pay, elapsed)}</span>
    </header>
    <main class="customer round">
      ${reward ? accordReward(reward) : ''}
      <blockquote class="memory">“${esc(b.text)}”</blockquote>
      ${b.extra.map((h) => `<p class="hint">“${esc(h)}”</p>`).join('')}
      <p class="small">They want it <strong>${esc(intensityWord(b.target.intensity))}</strong>.${b.ghost.length ? ' The dashed lines are part of what they described.' : ''}</p>
      <div class="radar-box">${radarChart(layers, scaleFor(target))}</div>
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

function percentWord(v: number): string {
  return v >= 0.85 ? 'spot on' : v >= 0.6 ? 'close' : v >= 0.35 ? 'some way off' : 'far off';
}

function intensityVerdict(values: Values, target: Values, score: number): string {
  const mine = SPOKES.reduce((a, s) => a + values[s], 0);
  const theirs = SPOKES.reduce((a, s) => a + target[s], 0);
  if (score >= 0.85) return 'just right';
  return mine > theirs ? (score >= 0.5 ? 'a little strong' : 'far too strong') : score >= 0.5 ? 'a little faint' : 'far too faint';
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
      <div class="radar-box">${radarChart([{ kind: 'target', values: r.target }, { kind: 'mix', values: r.values }], scaleFor(r.target))}</div>
      <p class="muted small reveal-key"><span class="key key--target">dashed</span> what ${esc(r.name)} wanted · <span class="key key--mix">filled</span> what you made</p>
      <p class="stars" aria-label="${r.score.stars} of 3 stars">${starsText(r.score.stars)}</p>
      <ul class="plain reveal-scores">
        <li><strong>Shape:</strong> ${percentWord(r.score.shape)} (${Math.round(r.score.shape * 100)}%)</li>
        <li><strong>Intensity:</strong> ${intensityVerdict(r.values, r.target, r.score.intensity)} (${Math.round(r.score.intensity * 100)}%)</li>
      </ul>
      <p class="reveal-cause">${esc(r.cause ?? 'Nothing to change: that’s exactly it.')}</p>
      ${accords ? `<p class="small">Accords in it: <strong>${esc(accords)}</strong></p>` : ''}
      <p class="muted small">You used ${esc(used)}.</p>
      ${r.thanks ? `<p>“${esc(r.thanks)}”</p>` : ''}
      ${r.page ? `<p class="banner small"><span>You've recovered a page of her book.</span></p>` : ''}
      <p>${r.pay ? `They pay <strong>${r.pay} coins</strong>${r.tip ? ` and tip <strong>${r.tip}</strong>` : ''}.` : 'It isn’t what they came for, so they won’t pay for it.'}</p>
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


