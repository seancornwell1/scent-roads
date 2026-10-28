import type { Formula, Material, Model } from './types';

// What's actually in a perfume. A formula lists parts by material (or by a saved base, keyed
// "base:<id>"), and each material can be used at 100%, 10% or 1%: one part of a dilution
// counts as one part of the formula but smells (and costs, and counts for safety) like a
// tenth or a hundredth of it, the rest being odourless solvent. Bases expand into their own
// materials. Everything that judges a perfume works from these expanded entries.

export type Dilution = 100 | 10 | 1;
export const DILUTIONS: readonly Dilution[] = [100, 10, 1];
export type Dilutions = Record<string, Dilution>;

export const BASE_PREFIX = 'base:';

/** A formula as written: parts, and the dilution each material is used at (100% if unset). */
export interface Recipe {
  parts: Formula;
  dilutions?: Dilutions;
}

/** A saved accord, reusable as one ingredient in larger formulas. */
export interface Base extends Recipe {
  id: string;
  name: string;
  createdAt: number;
}

export interface Entry {
  material: string;
  dilution: Dilution;
  /** Parts of the whole formula. */
  parts: number;
}

export const isBaseKey = (key: string) => key.startsWith(BASE_PREFIX);
export const baseKey = (id: string) => `${BASE_PREFIX}${id}`;

/** Expands a recipe (and any bases in it) into materials at their dilutions. */
export function entriesOf(recipe: Recipe, bases: Base[] = []): Entry[] {
  const out: Entry[] = [];
  const add = (material: string, dilution: Dilution, parts: number) => {
    const same = out.find((e) => e.material === material && e.dilution === dilution);
    if (same) same.parts += parts;
    else out.push({ material, dilution, parts });
  };
  for (const [key, parts] of Object.entries(recipe.parts)) {
    if (!(parts > 0)) continue;
    if (isBaseKey(key)) {
      const base = bases.find((b) => baseKey(b.id) === key);
      if (!base) continue;
      const total = Object.values(base.parts).reduce((a, b) => a + b, 0);
      for (const [m, p] of Object.entries(base.parts)) if (p > 0 && total > 0) add(m, base.dilutions?.[m] ?? 100, (parts * p) / total);
    } else add(key, recipe.dilutions?.[key] ?? 100, parts);
  }
  return out;
}

export function partsTotal(entries: Entry[]): number {
  return entries.reduce((a, e) => a + e.parts, 0);
}

/** What the nose gets: each material's parts times its strength in the bottle. */
export function effective(entries: Entry[]): Formula {
  const out: Formula = {};
  for (const e of entries) out[e.material] = (out[e.material] ?? 0) + (e.parts * e.dilution) / 100;
  return out;
}

/** Parts by material as written, whatever their dilution (for recognising accords). */
export function written(entries: Entry[]): Formula {
  const out: Formula = {};
  for (const e of entries) out[e.material] = (out[e.material] ?? 0) + e.parts;
  return out;
}

/** Percent of the formula (by weight) that is each material itself, solvent excluded. */
export function concentrations(entries: Entry[]): Formula {
  const total = partsTotal(entries);
  const eff = effective(entries);
  return Object.fromEntries(Object.entries(eff).map(([m, p]) => [m, total > 0 ? (p / total) * 100 : 0]));
}

/** Rough cost of 100 g of the formula (the concentrate), in euros. */
export function blendCost(entries: Entry[], materials: Map<string, Material>): number {
  let cost = 0;
  for (const [m, pct] of Object.entries(concentrations(entries))) cost += (pct / 100) * ((materials.get(m)?.ref.costPerKg ?? 0) / 10);
  return cost;
}

export interface SafetyIssue {
  material: string;
  /** Percent in the finished perfume (the concentrate diluted to the wearable concentration). */
  finishedPercent: number;
  limit: number;
}

/** Materials over their IFRA limit in the finished perfume. A formula with any can't be sold. */
export function safetyIssues(entries: Entry[], materials: Map<string, Material>, model: Model): SafetyIssue[] {
  const out: SafetyIssue[] = [];
  for (const [m, pct] of Object.entries(concentrations(entries))) {
    const limit = materials.get(m)?.ref.ifraLimit;
    if (limit === null || limit === undefined) continue;
    const finishedPercent = (pct * model.wearableConcentration) / 100;
    if (finishedPercent > limit + 1e-9) out.push({ material: m, finishedPercent, limit });
  }
  return out;
}

/**
 * Strong materials (usually worked at 1%) used too strong: above `overdose.maxPercent` of
 * the formula they smell harsh rather than adding a nuance. Dilute them.
 */
export function overdosed(entries: Entry[], materials: Map<string, Material>, model: Model): string[] {
  const { dilution, maxPercent } = model.overdose;
  return Object.entries(concentrations(entries))
    .filter(([m, pct]) => materials.get(m)?.ref.dilution === dilution && pct > maxPercent + 1e-9)
    .map(([m]) => m);
}

/** Grams of each material at each dilution that one perfume of `grams` needs. */
export function needs(entries: Entry[], grams: number): Entry[] {
  const total = partsTotal(entries);
  return entries.map((e) => ({ ...e, parts: total > 0 ? (e.parts / total) * grams : 0 }));
}
