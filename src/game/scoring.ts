import { drydown, intensity } from './evaporation';
import type { ScoringConfig, Target } from './clients';
import type { Family, Formula, Material, Model } from './types';

// Scores a perfume against a customer's hidden target at each stage of its drydown.

export interface StageScore {
  stage: string;
  /** 0–1: how well the stage's family balance matches the target. */
  score: number;
  /** Family id → share 0–1 of what the nose perceives at this stage. */
  families: Record<string, number>;
}

export interface ScoreResult {
  stages: StageScore[];
  mood: number;
  /** 1–5, like the target's strength. */
  strength: number;
  strengthScore: number;
  /** Hours until it fades below `longevityFadeAt` of its opening. */
  longevityHours: number;
  longevityScore: number;
  total: number;
  stars: number;
  /** The customer's first impression: mostly the opening, plus how strong it is. */
  impression: number;
  /** The stage that let the customer down, or null if every stage held up. */
  weakStage: string | null;
}

/** Below this, a stage counts as letting the customer down. */
export const STAGE_OK = 0.4;

export function stageFamilies(shares: { materialId: string; share: number }[], materials: Map<string, Material>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of shares) {
    const family = materials.get(s.materialId)?.family;
    if (family) out[family] = (out[family] ?? 0) + s.share / 100;
  }
  return out;
}

function normalise(weights: Record<string, number>): Record<string, number> {
  const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, v / total]));
}

/** Overlap of two distributions: 1 when identical, 0 when nothing in common. */
export function overlap(a: Record<string, number>, b: Record<string, number>): number {
  let sum = 0;
  for (const [k, v] of Object.entries(a)) sum += Math.min(v, b[k] ?? 0);
  return sum;
}

/** Strength 1–5 from the formula's average impact per part. */
export function strengthOf(formula: Formula, materials: Map<string, Material>, model: Model, config: ScoringConfig): number {
  let parts = 0;
  let impact = 0;
  for (const [id, p] of Object.entries(formula)) {
    const m = materials.get(id);
    if (!m) continue;
    parts += p;
    impact += p * model.strengthBase ** (m.model.strength - model.strengthPivot);
  }
  const average = parts > 0 ? impact / parts : 0;
  return 1 + config.strengthBands.filter((b) => average >= b).length;
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

export function scorePerfume(
  formula: Formula,
  target: Target,
  materials: Map<string, Material>,
  families: Family[],
  model: Model,
  config: ScoringConfig,
): ScoreResult {
  const want = normalise(target.families);
  const stages = drydown(formula, materials, model).map((p) => {
    const fam = stageFamilies(p.shares, materials);
    return { stage: p.stage.id, score: overlap(want, fam), families: fam };
  });

  // Mood: each family lends its moods an equal part of its share, averaged over the stages.
  const moodsOf = new Map(families.map((f) => [f.id, f.moods]));
  const moodWeight: Record<string, number> = {};
  for (const s of stages) {
    for (const [f, share] of Object.entries(s.families)) {
      const moods = moodsOf.get(f) ?? [];
      for (const m of moods) moodWeight[m] = (moodWeight[m] ?? 0) + share / moods.length / stages.length;
    }
  }
  const level = config.difficulties[config.difficulty];
  const mood = Math.min(1, target.moods.reduce((sum, m) => sum + (moodWeight[m] ?? 0), 0) / level.moodFullAt);

  const strength = strengthOf(formula, materials, model, config);
  const strengthScore = Math.max(0, 1 - Math.abs(strength - target.strength) / 3);
  const longevityHours = longevityOf(formula, materials, model, config);
  const longevityScore = Math.min(1, longevityHours / target.longevityHours);

  const w = config.weights;
  const stageAverage = stages.reduce((a, s) => a + s.score, 0) / (stages.length || 1);
  const total = w.stages * stageAverage + w.mood * mood + w.strength * strengthScore + w.longevity * longevityScore;
  const stars = 1 + level.stars.filter((t) => total >= t).length;
  const impression = 0.7 * (stages[0]?.score ?? 0) + 0.3 * strengthScore;

  let weakStage: string | null = null;
  const worst = stages.reduce<StageScore | null>((low, s) => (!low || s.score < low.score ? s : low), null);
  if (worst && worst.score < STAGE_OK) weakStage = worst.stage;
  else if (longevityScore < 0.6) weakStage = stages[stages.length - 1]?.stage ?? null;

  return { stages, mood, strength, strengthScore, longevityHours, longevityScore, total, stars, impression, weakStage };
}
