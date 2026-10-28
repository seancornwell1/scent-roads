import { drydown, intensity } from './evaporation';
import type { ScoringConfig, Target } from './clients';
import type { Formula, Material, Model } from './types';

// Scores a perfume against a brief's hidden target: a reference formula whose smell at each
// stage of the drydown, strength and staying power the customer has in mind. The score is
// closeness (0–1), shown as 1 to 3 stars; the directions say what to change, for feedback.

export interface StageScore {
  stage: string;
  /** 0–1: how well the stage's family balance matches the target's. */
  score: number;
  /** Family id → share 0–1 of what the nose perceives at this stage. */
  families: Record<string, number>;
  /** The same for the target. */
  target: Record<string, number>;
}

/** One thing the customer would change. `want` is what they'd like more or less of. */
export type Direction =
  | { kind: 'family'; family: string; stage: string; want: 'more' | 'less'; size: number }
  | { kind: 'strength' | 'longevity'; want: 'more' | 'less'; size: number };

export interface ScoreResult {
  stages: StageScore[];
  /** Perfume's strength over the target's (1 = the same). */
  strengthRatio: number;
  strengthScore: number;
  /** Hours until it fades below `longevityFadeAt` of its opening. */
  longevityHours: number;
  targetLongevityHours: number;
  longevityScore: number;
  total: number;
  /** 1–3. */
  stars: number;
  /** The customer's first impression: mostly the opening, plus how strong it is. */
  impression: number;
  /** The stage furthest from the target, or null if every stage is close. */
  weakStage: string | null;
  /** What to change, most important first. */
  directions: Direction[];
  /** Average quality of the materials used (1 = good), if known. */
  quality?: number;
}

/** Below this, a stage counts as letting the customer down. */
export const STAGE_OK = 0.75;

export function stageFamilies(shares: { materialId: string; share: number }[], materials: Map<string, Material>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of shares) {
    const family = materials.get(s.materialId)?.family;
    if (family) out[family] = (out[family] ?? 0) + s.share / 100;
  }
  return out;
}

/** Overlap of two distributions: 1 when identical, 0 when nothing in common. */
export function overlap(a: Record<string, number>, b: Record<string, number>): number {
  let sum = 0;
  for (const [k, v] of Object.entries(a)) sum += Math.min(v, b[k] ?? 0);
  return sum;
}

/** Average impact per part: how loud the formula smells, before it evaporates. */
export function impactOf(formula: Formula, materials: Map<string, Material>, model: Model): number {
  let parts = 0;
  let impact = 0;
  for (const [id, p] of Object.entries(formula)) {
    const m = materials.get(id);
    if (!m) continue;
    parts += p;
    impact += p * model.strengthBase ** (m.model.strength - model.strengthPivot);
  }
  return parts > 0 ? impact / parts : 0;
}

export function longevityOf(formula: Formula, materials: Map<string, Material>, model: Model, config: ScoringConfig): number {
  const total = (hours: number) =>
    Object.entries(formula).reduce((sum, [id, p]) => {
      const m = materials.get(id);
      return m ? sum + intensity(m, p, hours, model) : sum;
    }, 0);
  const start = total(model.stages[0].hours);
  if (start <= 0) return 0;
  for (let h = 0.25; h <= config.longevityMaxHours; h += 0.25) if (total(h) < start * config.longevityFadeAt) return h;
  return config.longevityMaxHours;
}

/** 1 when the ratio is 1, falling to 0 at `span` doublings (or halvings) away. */
function ratioScore(ratio: number, span: number): number {
  if (!(ratio > 0)) return 0;
  return Math.max(0, 1 - Math.abs(Math.log2(ratio)) / span);
}

export function starsFor(total: number, config: ScoringConfig, strictness = 0): number {
  return 1 + config.difficulties[config.difficulty].stars.filter((t) => total >= t + strictness).length;
}

export function scorePerfume(formula: Formula, target: Target, materials: Map<string, Material>, model: Model, config: ScoringConfig): ScoreResult {
  const mine = drydown(formula, materials, model);
  const theirs = drydown(target.formula, materials, model);
  const stages = mine.map((p, i) => {
    const fam = stageFamilies(p.shares, materials);
    const want = stageFamilies(theirs[i].shares, materials);
    return { stage: p.stage.id, score: overlap(want, fam), families: fam, target: want };
  });

  const strengthRatio = impactOf(formula, materials, model) / (impactOf(target.formula, materials, model) || 1);
  const strengthScore = ratioScore(strengthRatio, 2);
  const longevityHours = longevityOf(formula, materials, model, config);
  const targetLongevityHours = longevityOf(target.formula, materials, model, config);
  const longevityScore = ratioScore(longevityHours / (targetLongevityHours || 1), 2);

  const w = config.weights;
  const stageAverage = stages.reduce((a, s) => a + s.score, 0) / (stages.length || 1);
  const total = w.stages * stageAverage + w.strength * strengthScore + w.longevity * longevityScore;
  const impression = 0.7 * (stages[0]?.score ?? 0) + 0.3 * strengthScore;

  const worst = stages.reduce<StageScore | null>((low, s) => (!low || s.score < low.score ? s : low), null);
  const weakStage = worst && worst.score < STAGE_OK ? worst.stage : null;

  return {
    stages,
    strengthRatio,
    strengthScore,
    longevityHours,
    targetLongevityHours,
    longevityScore,
    total,
    stars: starsFor(total, config),
    impression,
    weakStage,
    directions: directionsFor(stages, strengthRatio, longevityHours / (targetLongevityHours || 1), config),
  };
}

/**
 * What the customer would change, biggest first: for each family, the stage where it's
 * furthest off; then strength and staying power. Differences within tolerance don't count.
 */
export function directionsFor(stages: StageScore[], strengthRatio: number, longevityRatio: number, config: ScoringConfig): Direction[] {
  const byFamily = new Map<string, Direction & { kind: 'family' }>();
  for (const s of stages) {
    for (const family of new Set([...Object.keys(s.families), ...Object.keys(s.target)])) {
      const diff = (s.families[family] ?? 0) - (s.target[family] ?? 0);
      const size = Math.abs(diff);
      if (size < config.tolerance) continue;
      const best = byFamily.get(family);
      if (!best || size > best.size) byFamily.set(family, { kind: 'family', family, stage: s.stage, want: diff > 0 ? 'less' : 'more', size });
    }
  }
  const out: Direction[] = [...byFamily.values()];
  const strengthOff = Math.abs(Math.log2(strengthRatio || 1e-6));
  if (strengthOff > 0.6) out.push({ kind: 'strength', want: strengthRatio < 1 ? 'more' : 'less', size: strengthOff / 4 });
  const longevityOff = Math.abs(Math.log2(longevityRatio || 1e-6));
  if (longevityOff > 0.5) out.push({ kind: 'longevity', want: longevityRatio < 1 ? 'more' : 'less', size: longevityOff / 4 });
  return out.sort((a, b) => b.size - a.size);
}

/** Better materials make better perfumes: shifts the scores by the materials' quality, and applies the customer's strictness. */
export function applyQuality(r: ScoreResult, quality: number, effect: number, config: ScoringConfig, strictness = 0): ScoreResult {
  const bonus = (quality - 1) * effect;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const total = clamp(r.total + bonus);
  // More demanding customers (from a more appealing shop) raise every star threshold.
  return { ...r, total, stars: starsFor(total, config, strictness), impression: clamp(r.impression + bonus), quality };
}
