import counterJson from '../data/counter.json';
import type { Brief } from './clients';
import { materialsById } from './content';
import { missCause, radarData, radarOf, scoreRadar, spokeInfo, SPOKES, strengthOf, targetOf, type Mix, type Radar, type RoundScore, type Target } from './radar';
import type { Spoke } from './types';

// A customer round at the counter. Every brief comes from a hidden solution (a mix of drops
// of materials the player has unlocked), so its target is always reachable. Story requests
// and regulars keep their written briefs, their formula as the solution; walk-ins get one
// made up from the player's materials. The round runs on a timer: serving within a time tier earns a tip, and
// each test ping fades faster than the one before.

export interface CounterData {
  /** Tips by speed: served within a tier's `withinSeconds` (real seconds), they tip `share` of the pay; slower than every tier, no tip. `text` says why at the reveal. */
  tip: { tiers: { withinSeconds: number; share: number; text: string }[] };
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
  /**
   * Material EXP: `perServe` for each material in a served perfume; `levels` is the EXP each
   * level starts at (level 1 at the first). Words for a card's strength and volatility.
   */
  /** Difficulty by stage of the game (reputation, until competitions exist). */
  progression: Progression;
  exp: {
    perServe: number;
    levels: number[];
    strengthWords: { min: number; text: string }[];
    volatilityWords: { maxHours: number; text: string }[];
  };
}

export interface ProgressionStage {
  /** Reputation it starts at. */
  reputation: number;
  name: string;
  /** Materials (range) and drops of each (range) in a walk-in's solution. */
  materials: [number, number];
  drops: [number, number];
  /** Only the starting materials (the first days' single-shape briefs). */
  startingOnly: boolean;
  /** Chance a walk-in names a material and shows a ghost outline (general → specific). */
  specificChance: number;
  /** Chances of a must-include and a must-avoid; both together only when `bothAllowed`. */
  includeChance: number;
  avoidChance: number;
  bothAllowed: boolean;
  /** Chance of a time-shifted brief (an opening and a drydown target). */
  shiftedChance: number;
}

export interface Progression {
  starting: string[];
  stages: ProgressionStage[];
  /** Season name → spokes customers lean towards then; materials pushing them are `seasonWeight` times likelier. */
  seasons: Record<string, Spoke[]>;
  seasonWeight: number;
  /** Time-shifted briefs: the model stages they're judged at, and what counts as a top note (half-life at most) and a base note (at least), in hours. */
  shifted: { opening: string; drydown: string; volatileMaxHalfLife: number; tenaciousMinHalfLife: number };
  texts: { include: string[]; avoid: string[]; shifted: string[]; brokeInclude: string; brokeAvoid: string };
}

export const counter = counterJson as unknown as CounterData;

/** The stage of the game a reputation puts you at. */
export function stageAt(reputation: number, data: CounterData = counter): ProgressionStage {
  return [...data.progression.stages].reverse().find((s) => reputation >= s.reputation) ?? data.progression.stages[0];
}

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
  /** A material that must be in it, or must not be. */
  include?: string;
  avoid?: string;
  /** A time-shifted brief's targets at each stage (`target` is the first). */
  stages?: { id: string; name: string; hours: number; target: Target }[];
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
  /** The test bench: a mix in progress and its tests (no timer, no money, no EXP). */
  bench: { drops: Mix; tests: number };
  /** Material id → EXP from served perfumes. */
  exp: Record<string, number>;
}

export function newCounterState(): CounterState {
  return { round: null, bench: { drops: {}, tests: 0 }, exp: {} };
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

/** Where a walk-in comes in: their stage of the game and the season. */
export interface BriefContext {
  reputation: number;
  season: string;
  /** The model's stages (id, name, hours), for time-shifted briefs. */
  modelStages: { id: string; name: string; hours: number }[];
}

const name = (id: string) => (materialsById.get(id)?.name ?? id).toLowerCase();
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const topSpoke = (id: string): Spoke | undefined => (Object.entries(materialsById.get(id)?.radar.vector ?? {}) as [Spoke, number][]).sort((a, b) => b[1] - a[1])[0]?.[0];

/** Picks one id, the season's materials more likely. */
function pickWeighted(ids: string[], season: Spoke[], weight: number, rnd: () => number): string {
  const ws = ids.map((id) => (season.includes(topSpoke(id)!) ? weight : 1));
  let r = rnd() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ids.length; i++) if ((r -= ws[i]) < 0) return ids[i];
  return ids[ids.length - 1];
}

/**
 * A walk-in's brief, made up from materials the player has, as hard as their stage of the
 * game: how many materials, general or specific, must-include and must-avoid, and (from mid
 * game) an opening and a drydown target. The season nudges which families they ask for.
 */
export function walkInBrief(owned: string[], rnd: () => number, ctx: BriefContext = { reputation: 0, season: 'Spring', modelStages: [] }, data: CounterData = counter): RoundBrief {
  const pr = data.progression;
  const stage = stageAt(ctx.reputation, data);
  const season = pr.seasons[ctx.season] ?? [];
  let pool = owned.filter((id) => materialsById.has(id));
  if (stage.startingOnly) {
    const first = pool.filter((id) => pr.starting.includes(id));
    if (first.length) pool = first;
  }
  const count = Math.max(1, Math.min(pool.length, between(stage.materials, rnd)));
  const opening = ctx.modelStages.find((x) => x.id === pr.shifted.opening);
  const drydown = ctx.modelStages.find((x) => x.id === pr.shifted.drydown);
  const tops = pool.filter((id) => materialsById.get(id)!.model.halfLifeHours <= pr.shifted.volatileMaxHalfLife);
  const bases = pool.filter((id) => materialsById.get(id)!.model.halfLifeHours >= pr.shifted.tenaciousMinHalfLife);
  const shifted = !!opening && !!drydown && count >= 2 && tops.length > 0 && bases.length > 0 && rnd() < stage.shiftedChance;

  const chosen: string[] = [];
  if (shifted) {
    // A top note and a base note, so the shape moves as it dries down.
    chosen.push(pickWeighted(tops, season, pr.seasonWeight, rnd), pickWeighted(bases, season, pr.seasonWeight, rnd));
  }
  for (let guard = 0; chosen.length < count && guard < 50; guard++) {
    const id = pickWeighted(pool, season, pr.seasonWeight, rnd);
    if (!chosen.includes(id)) chosen.push(id);
  }
  const solution: Mix = Object.fromEntries(chosen.map((id) => [id, between(stage.drops, rnd)]));
  const radar = radarOf(solution);
  const target = targetOf(radar);
  const [first, second] = topSpokes(target, 2);
  const specific = rnd() < stage.specificChance;
  // A specific brief names the material that pushes its main spoke hardest.
  const lead = Object.entries(radar.pushes).sort((a, b) => b[1][first] - a[1][first])[0]?.[0] ?? chosen[0];

  let stages: RoundBrief['stages'];
  let text: string;
  if (shifted) {
    stages = [opening!, drydown!].map((st) => ({ id: st.id, name: st.name, hours: st.hours, target: targetOf(radarOf(solution, st.hours)) }));
    const late = topSpokes(stages[1].target, 1)[0];
    const early = topSpokes(stages[0].target, 1)[0];
    text = cap(pick(pr.texts.shifted, rnd).replace('{word}', spokeInfo(early).word).replace('{word2}', spokeInfo(late).word));
    if (specific) text += ` ${cap(pick(data.briefs.specific, rnd).replace('{word}', spokeInfo(first).word).replace('{material}', name(lead)))}`;
  } else {
    const template = specific ? pick(data.briefs.specific, rnd) : target.shape[second] >= 0.2 ? pick(data.briefs.vagueTwo, rnd) : pick(data.briefs.vague, rnd);
    text = template.replace('{word}', spokeInfo(first).word).replace('{word2}', spokeInfo(second).word).replace('{material}', name(lead));
  }

  // Modifiers: a must-include from the solution; a must-avoid that's tempting (it pushes the
  // same way) but not in it. Both together only late in the game.
  let include: string | undefined;
  let avoid: string | undefined;
  const extra: string[] = [];
  if (rnd() < stage.includeChance) include = chosen[Math.floor(rnd() * chosen.length)];
  if ((!include || stage.bothAllowed) && rnd() < stage.avoidChance) {
    const others = pool.filter((id) => !chosen.includes(id));
    const tempting = others.filter((id) => topSpoke(id) === first || topSpoke(id) === second);
    const from = tempting.length ? tempting : others;
    if (from.length) avoid = from[Math.floor(rnd() * from.length)];
  }
  if (include) extra.push(fill(pick(pr.texts.include, rnd), include));
  if (avoid) extra.push(fill(pick(pr.texts.avoid, rnd), avoid));

  return {
    text,
    extra,
    solution,
    target: stages ? stages[0].target : target,
    ghost: specific ? topSpokes(target, data.ghostSpokes) : [],
    pay: data.walkIn.pay.base + data.walkIn.pay.perMaterial * count + (shifted ? data.walkIn.pay.perMaterial : 0),
    ...(include ? { include } : {}),
    ...(avoid ? { avoid } : {}),
    ...(stages ? { stages } : {}),
  };
}

function fill(t: string, id: string): string {
  return t.replace('{Material}', cap(name(id))).replace('{material}', name(id));
}

export interface StageJudgement {
  name: string;
  radar: Radar;
  target: Target;
  score: RoundScore;
}

export interface Judgement {
  score: RoundScore;
  /** The main cause of any miss, in plain words (or a broken must-include / must-avoid). */
  cause: string | null;
  stages: StageJudgement[];
  /** Accords in the mix (at the first stage). */
  accords: string[];
}

/**
 * Judges a mix against a brief: each stage's shape and intensity (a time-shifted brief at
 * each of its stages), averaged; a broken must-include or must-avoid caps it at one star.
 */
export function judgeRound(drops: Mix, brief: RoundBrief, data: CounterData = counter): Judgement {
  const stages = (brief.stages ?? [{ id: '', name: '', hours: 0, target: brief.target }]).map((st) => {
    const radar = radarOf(drops, st.hours);
    return { name: st.name, radar, target: st.target, score: scoreRadar(radar, st.target) };
  });
  const avg = (f: (x: StageJudgement) => number) => stages.reduce((a, x) => a + f(x), 0) / stages.length;
  const total = avg((x) => x.score.total);
  const stars = (1 + radarData.scoring.stars.filter((t) => total >= t).length) as 1 | 2 | 3;
  const score: RoundScore = { shape: avg((x) => x.score.shape), intensity: avg((x) => x.score.intensity), total, stars };
  const worst = [...stages].sort((a, b) => a.score.total - b.score.total)[0];
  let cause = stars === 3 && total > 0.9 ? null : missCause(worst.radar, worst.target);
  if (cause && stages.length > 1) cause = `${worst.name}: ${cause}`;
  const broke = brief.include && !(drops[brief.include] > 0) ? data.progression.texts.brokeInclude.replace('{material}', name(brief.include)) : brief.avoid && drops[brief.avoid] > 0 ? data.progression.texts.brokeAvoid.replace('{material}', name(brief.avoid)) : null;
  if (broke) {
    score.stars = 1;
    cause = broke;
  }
  return { score, cause, stages, accords: stages[0].radar.accords };
}

export function intensityWord(intensity: number, data: CounterData = counter): string {
  return [...data.intensityWords].reverse().find((b) => intensity >= b.min)?.text ?? data.intensityWords[0].text;
}

/** The time tier a round finished in, if any (the fastest it qualifies for). */
export function tipTier(elapsedMs: number, data: CounterData = counter): CounterData['tip']['tiers'][number] | null {
  return [...data.tip.tiers].sort((a, b) => a.withinSeconds - b.withinSeconds).find((t) => elapsedMs / 1000 <= t.withinSeconds) ?? null;
}

/** The tip for serving after `elapsedMs`: by time tier, nothing if slower than every tier. */
export function tipFor(pay: number, elapsedMs: number, data: CounterData = counter): number {
  const tier = tipTier(elapsedMs, data);
  return tier ? Math.round(pay * tier.share) : 0;
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

// Material EXP: served perfumes teach you their materials. A card shows more at each level:
// 1, direction unknown; 2, its main direction; 3, how strongly it pushes; max, its exact
// vector and its volatility.

export function expLevel(exp: number, data: CounterData = counter): number {
  return data.exp.levels.filter((x) => exp >= x).length;
}

export function maxLevel(data: CounterData = counter): number {
  return data.exp.levels.length;
}

/** Adds EXP for every material in a served perfume. Returns the ones that levelled up, with their new level. */
export function awardExp(c: CounterState, mix: Mix, data: CounterData = counter): { id: string; level: number }[] {
  const ups: { id: string; level: number }[] = [];
  for (const [id, drops] of Object.entries(mix)) {
    if (drops <= 0) continue;
    const before = expLevel(c.exp[id] ?? 0, data);
    c.exp[id] = (c.exp[id] ?? 0) + data.exp.perServe;
    const after = expLevel(c.exp[id], data);
    if (after > before) ups.push({ id, level: after });
  }
  return ups;
}

export interface Card {
  level: number;
  /** Its main spoke, from level 2. */
  direction?: Spoke;
  /** How hard it pushes, in words, from level 3. */
  strength?: string;
  /** Its exact vector and how long it lasts, at the top level. */
  vector?: Partial<Record<Spoke, number>>;
  volatility?: string;
}

/** What a material's card shows at its level. */
export function cardFor(id: string, exp: number, data: CounterData = counter): Card {
  const m = materialsById.get(id);
  const level = expLevel(exp, data);
  if (!m) return { level };
  const card: Card = { level };
  const entries = Object.entries(m.radar.vector) as [Spoke, number][];
  if (level >= 2) card.direction = entries.sort((a, b) => b[1] - a[1])[0][0];
  if (level >= 3) {
    const s = strengthOf(m);
    card.strength = [...data.exp.strengthWords].reverse().find((w) => s >= w.min)?.text;
  }
  if (level >= maxLevel(data)) {
    card.vector = { ...m.radar.vector };
    card.volatility = data.exp.volatilityWords.find((w) => m.model.halfLifeHours <= w.maxHours)?.text;
  }
  return card;
}

