import counterJson from '../data/counter.json';
import type { Brief } from './clients';
import { materialsById } from './content';
import { radarOf, spokeInfo, SPOKES, targetOf, type Mix, type Target } from './radar';
import type { Spoke } from './types';

// A customer round at the counter. Every brief comes from a hidden solution (a mix of drops
// of materials the player has unlocked), so its target is always reachable. Story requests
// and regulars keep their written briefs, their formula as the solution; walk-ins get one
// made up from the player's materials. The round runs on a timer that shrinks the tip, and
// each test ping fades faster than the one before.

export interface CounterData {
  /** The tip is `share` of the pay at the start, shrinking to nothing at `seconds`. */
  tip: { seconds: number; share: number };
  /** The first test ping shows for `firstMs`; each next one for `factor` × the last, down to `minMs`. */
  ping: { firstMs: number; factor: number; minMs: number };
  /** How a target intensity is described: the highest band whose `min` it reaches. */
  intensityWords: { min: number; text: string }[];
  /** How many of the target's spokes a specific brief shows as a ghost outline. */
  ghostSpokes: number;
  walkIn: {
    /** How many materials (range) and drops of each (range) a walk-in's solution has. */
    materials: [number, number];
    drops: [number, number];
    pay: { base: number; perMaterial: number };
    /** Chance a walk-in's brief is specific (names a material and shows a ghost). */
    specificChance: number;
  };
  /** Walk-ins' words: {word}, {word2} are spokes' words, {material} a material in it. */
  briefs: { vague: string[]; vagueTwo: string[]; specific: string[] };
}

export const counter = counterJson as CounterData;

export interface RoundBrief {
  /** What the customer says. */
  text: string;
  /** More they tell you (a written brief's hints). */
  extra: string[];
  /** The hidden solution: drops of each material. */
  solution: Mix;
  target: Target;
  /** Specific briefs show part of the target (these spokes) as a ghost outline. */
  ghost: Spoke[];
  pay: number;
}

export interface RoundState {
  visitId: string;
  /** Real time the round started (ms). */
  startedAt: number;
  drops: Mix;
  /** Tests run so far this round. */
  tests: number;
  brief: RoundBrief;
}

export interface CounterState {
  round: RoundState | null;
  /** Material id → EXP from served perfumes. */
  exp: Record<string, number>;
}

export function newCounterState(): CounterState {
  return { round: null, exp: {} };
}

/** A written formula as drops: 10-part formulas drop for drop; 100-part ones in tenths. */
export function solutionFromFormula(formula: Record<string, number>): Mix {
  const total = Object.values(formula).reduce((a, b) => a + b, 0);
  const scale = total > 20 ? 0.1 : 1;
  return Object.fromEntries(Object.entries(formula).map(([id, p]) => [id, Math.max(1, Math.round(p * scale))]));
}

/** The target's strongest spokes, strongest first. */
export function topSpokes(t: Target, n: number): Spoke[] {
  return [...SPOKES].sort((a, b) => t.shape[b] - t.shape[a]).slice(0, n);
}

/** A story request's or regular's written brief, as a round: always specific. */
export function writtenBrief(b: Brief, data: CounterData = counter): RoundBrief {
  const solution = solutionFromFormula(b.target.formula);
  const target = targetOf(radarOf(solution));
  return { text: b.memory, extra: b.hints, solution, target, ghost: topSpokes(target, data.ghostSpokes), pay: b.pay };
}

const between = ([lo, hi]: [number, number], rnd: () => number) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = <T>(list: T[], rnd: () => number): T => list[Math.floor(rnd() * list.length)];

/** A walk-in's brief, made up from materials the player has. */
export function walkInBrief(owned: string[], rnd: () => number, data: CounterData = counter): RoundBrief {
  const w = data.walkIn;
  const pool = owned.filter((id) => materialsById.has(id));
  const count = Math.min(pool.length, between(w.materials, rnd));
  const chosen: string[] = [];
  while (chosen.length < count) {
    const id = pick(pool, rnd);
    if (!chosen.includes(id)) chosen.push(id);
  }
  const solution: Mix = Object.fromEntries(chosen.map((id) => [id, between(w.drops, rnd)]));
  const radar = radarOf(solution);
  const target = targetOf(radar);
  const [first, second] = topSpokes(target, 2);
  const specific = rnd() < w.specificChance;
  // A specific brief names the material that pushes its main spoke hardest.
  const lead = Object.entries(radar.pushes).sort((a, b) => b[1][first] - a[1][first])[0]?.[0];
  const template = specific ? pick(data.briefs.specific, rnd) : target.shape[second] >= 0.2 ? pick(data.briefs.vagueTwo, rnd) : pick(data.briefs.vague, rnd);
  const text = template
    .replace('{word}', spokeInfo(first).word)
    .replace('{word2}', spokeInfo(second).word)
    .replace('{material}', (materialsById.get(lead ?? '')?.name ?? '').toLowerCase());
  return { text, extra: [], solution, target, ghost: specific ? topSpokes(target, data.ghostSpokes) : [], pay: w.pay.base + w.pay.perMaterial * count };
}

export function intensityWord(intensity: number, data: CounterData = counter): string {
  return [...data.intensityWords].reverse().find((b) => intensity >= b.min)?.text ?? data.intensityWords[0].text;
}

/** The tip left after `elapsedMs` at the counter. */
export function tipFor(pay: number, elapsedMs: number, data: CounterData = counter): number {
  const left = Math.max(0, 1 - elapsedMs / 1000 / data.tip.seconds);
  return Math.round(pay * data.tip.share * left);
}

/** How long the next test ping shows, after `tests` earlier ones this round. */
export function pingMs(tests: number, data: CounterData = counter): number {
  return Math.max(data.ping.minMs, Math.round(data.ping.firstMs * data.ping.factor ** tests));
}

export function addDrop(mix: Mix, id: string, delta: number): Mix {
  const next = { ...mix, [id]: Math.max(0, (mix[id] ?? 0) + delta) };
  if (next[id] === 0) delete next[id];
  return next;
}
