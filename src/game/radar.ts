import radarJson from '../data/radar.json';
import { materialsById } from './content';
import type { Material, Spoke } from './types';

// The counter's radar: every drop of a material pushes the chart's spokes (olfactive
// families) by its vector, scaled by its strength. Each extra drop of the same material
// pushes less than the one before. Some pairs push further together (accords); some go
// muddy (clashes), and so do mixes with too many materials. The chart's overall size is the
// mix's intensity; its shape is where that intensity goes.

export interface RadarData {
  spokes: { id: Spoke; name: string; too: string; more: string; word: string }[];
  /** A drop's push is base ^ (strength − pivot) times its vector. */
  strength: { base: number; pivot: number };
  /** Each further drop of a material pushes this share of the one before. */
  dropDecay: number;
  /** Bonuses: when every group has a drop, `bonus` × the weakest group's push goes to `spokes`. */
  accords: { accord: string; groups: string[][]; spokes: Partial<Record<Spoke, number>>; bonus: number }[];
  /** Muddy pairs: when every group has a drop, the whole chart shrinks by `shrink`. */
  clashes: { id: string; groups: string[][]; shrink: number; text: string; verified: boolean }[];
  /** Beyond `free` materials, each one more shrinks the chart by `shrinkPerExtra`. */
  crowding: { free: number; shrinkPerExtra: number; text: string };
  scoring: {
    /** Shape overlap at or below this scores 0 (two random shapes overlap about this much); 1 is a perfect match. */
    shapeFloor: number;
    /** Share of the total that is shape (the rest is intensity). */
    shapeWeight: number;
    /** Doublings below (`underSpan`) or above (`overSpan`) the target at which intensity scores 0. */
    underSpan: number;
    overSpan: number;
    /** Totals for two and three stars. */
    stars: [number, number];
  };
}

export const radarData = radarJson as unknown as RadarData;
export const SPOKES: Spoke[] = radarData.spokes.map((s) => s.id);

export type Values = Record<Spoke, number>;
/** Drops of each material. */
export type Mix = Record<string, number>;

export interface Radar {
  /** How far the chart reaches on each spoke. */
  values: Values;
  /** The chart's overall size: the sum of its spokes. */
  intensity: number;
  /** Where the intensity goes: each spoke's share (sums to 1, or all 0 for an empty mix). */
  shape: Values;
  /** Accords that pushed (accord ids). */
  accords: string[];
  /** What went muddy: clash ids, and "crowded" for too many materials. */
  muddy: string[];
  /** What each material pushed, before bonuses and shrinking (for explaining a miss). */
  pushes: Record<string, Values>;
}

const zero = (): Values => Object.fromEntries(SPOKES.map((s) => [s, 0])) as Values;

/** How hard one drop of a material pushes, from its strength rating. */
export function strengthOf(m: Material, data: RadarData = radarData): number {
  return data.strength.base ** (m.model.strength - data.strength.pivot);
}

/** The push of n drops of one material, in drops-worth: 1, then 1 + d, 1 + d + d², … */
export function dropsWorth(n: number, data: RadarData = radarData): number {
  const d = data.dropDecay;
  return n <= 0 ? 0 : (1 - d ** n) / (1 - d);
}

/** How much of a material is still there `hours` after it's put on (1 at the start). */
export function remaining(m: Material, hours: number): number {
  return 0.5 ** (hours / m.model.halfLifeHours);
}

function present(mix: Mix, group: string[]): boolean {
  return group.some((id) => (mix[id] ?? 0) > 0);
}

/**
 * The radar of a mix, optionally `hours` after it's put on: by then each material has
 * faded by its half-life (the existing volatility model).
 */
export function radarOf(mix: Mix, hours = 0, materials: Map<string, Material> = materialsById, data: RadarData = radarData): Radar {
  const values = zero();
  const pushes: Record<string, Values> = {};
  for (const [id, drops] of Object.entries(mix)) {
    const m = materials.get(id);
    if (!m || drops <= 0) continue;
    const amount = dropsWorth(drops, data) * strengthOf(m, data) * remaining(m, hours);
    const push = zero();
    for (const [spoke, w] of Object.entries(m.radar.vector) as [Spoke, number][]) {
      push[spoke] = w * amount;
      values[spoke] += push[spoke];
    }
    pushes[id] = push;
  }
  const total = (id: string) => SPOKES.reduce((a, s) => a + (pushes[id]?.[s] ?? 0), 0);

  const accords: string[] = [];
  for (const a of data.accords) {
    if (!a.groups.every((g) => present(mix, g))) continue;
    // The weakest group sets how much the accord adds: both halves have to be there.
    const weakest = Math.min(...a.groups.map((g) => g.reduce((sum, id) => sum + total(id), 0)));
    if (weakest <= 0) continue;
    for (const [spoke, w] of Object.entries(a.spokes) as [Spoke, number][]) values[spoke] += a.bonus * weakest * w;
    accords.push(a.accord);
  }

  const muddy: string[] = [];
  let keep = 1;
  for (const c of data.clashes) {
    if (!c.groups.every((g) => present(mix, g))) continue;
    keep *= 1 - c.shrink;
    muddy.push(c.id);
  }
  const used = Object.values(mix).filter((n) => n > 0).length;
  if (used > data.crowding.free) {
    keep *= Math.max(0.3, 1 - data.crowding.shrinkPerExtra * (used - data.crowding.free));
    muddy.push('crowded');
  }
  for (const s of SPOKES) values[s] *= keep;

  const intensity = SPOKES.reduce((a, s) => a + values[s], 0);
  const shape = zero();
  if (intensity > 0) for (const s of SPOKES) shape[s] = values[s] / intensity;
  return { values, intensity, shape, accords, muddy, pushes };
}

/** How close two shapes are: 1 when the same, 0 when nothing in common. */
export function shapeMatch(a: Values, b: Values): number {
  return SPOKES.reduce((sum, s) => sum + Math.min(a[s], b[s]), 0);
}

/** How close an intensity is to the target: 1 on it, falling to 0 at the spans below or above. */
export function intensityMatch(intensity: number, target: number, data: RadarData = radarData): number {
  if (!(intensity > 0) || !(target > 0)) return 0;
  const doublings = Math.log2(intensity / target);
  const span = doublings > 0 ? data.scoring.overSpan : data.scoring.underSpan;
  return Math.max(0, 1 - Math.abs(doublings) / span);
}

export interface Target {
  shape: Values;
  intensity: number;
}

export interface RoundScore {
  shape: number;
  intensity: number;
  total: number;
  stars: 1 | 2 | 3;
}

export function targetOf(r: Radar): Target {
  return { shape: { ...r.shape }, intensity: r.intensity };
}

/** Scores a radar against a target: shape and intensity separately, and together as 1–3 stars. */
export function scoreRadar(r: Radar, t: Target, data: RadarData = radarData): RoundScore {
  const floor = data.scoring.shapeFloor;
  const shape = Math.max(0, (shapeMatch(r.shape, t.shape) - floor) / (1 - floor));
  const intensity = intensityMatch(r.intensity, t.intensity, data);
  const w = data.scoring.shapeWeight;
  const total = w * shape + (1 - w) * intensity;
  const stars = (1 + data.scoring.stars.filter((x) => total >= x).length) as 1 | 2 | 3;
  return { shape, intensity, total, stars };
}

export function spokeInfo(s: Spoke, data: RadarData = radarData): RadarData['spokes'][number] {
  return data.spokes.find((x) => x.id === s)!;
}

/**
 * The main cause of a miss, in plain words: a clash or crowding first; then the spoke that's
 * furthest off (too much: the material pushing it hardest; too little: what it needed); then
 * intensity. Null when it's close enough not to need saying.
 */
export function missCause(r: Radar, t: Target, materials: Map<string, Material> = materialsById, data: RadarData = radarData): string | null {
  for (const id of r.muddy) {
    if (id === 'crowded') return data.crowding.text;
    const c = data.clashes.find((x) => x.id === id);
    if (c) return c.text;
  }
  let worst: Spoke | null = null;
  let gap = 0;
  for (const s of SPOKES) {
    const d = r.shape[s] - t.shape[s];
    if (Math.abs(d) > Math.abs(gap)) {
      gap = d;
      worst = s;
    }
  }
  if (worst && Math.abs(gap) >= 0.08) {
    const info = spokeInfo(worst, data);
    if (gap > 0) {
      const culprit = Object.entries(r.pushes).sort((a, b) => b[1][worst!] - a[1][worst!])[0];
      const name = culprit && culprit[1][worst] > 0 ? materials.get(culprit[0])?.name.toLowerCase() : null;
      return name ? `The ${name} pulled it ${info.too}.` : `It came out ${info.too}.`;
    }
    return `It needed ${info.more}.`;
  }
  const ratio = t.intensity > 0 ? r.intensity / t.intensity : 1;
  if (ratio > 1.35) return 'The shape was right, but it was too strong.';
  if (ratio < 0.75) return 'The shape was right, but it was too faint.';
  return null;
}

/** Checks the radar data against the materials and accords. */
export function validateRadar(materials: Material[], accordIds: Set<string>, data: RadarData = radarData): string[] {
  const errors: string[] = [];
  const ids = new Set(materials.map((m) => m.id));
  const spokes = new Set<string>(SPOKES);
  for (const m of materials) {
    const v = m.radar?.vector;
    if (!v || Object.keys(v).length === 0) {
      errors.push(`material "${m.id}": no radar vector`);
      continue;
    }
    for (const k of Object.keys(v)) if (!spokes.has(k)) errors.push(`material "${m.id}": unknown spoke "${k}"`);
    if (Math.max(...Object.values(v)) !== 1) errors.push(`material "${m.id}": its strongest spoke should be 1`);
  }
  for (const a of data.accords) {
    if (!accordIds.has(a.accord)) errors.push(`radar accord "${a.accord}": not in accords.json`);
    for (const g of a.groups) for (const id of g) if (!ids.has(id)) errors.push(`radar accord "${a.accord}": unknown material "${id}"`);
  }
  for (const c of data.clashes) for (const g of c.groups) for (const id of g) if (!ids.has(id)) errors.push(`clash "${c.id}": unknown material "${id}"`);
  return errors;
}
