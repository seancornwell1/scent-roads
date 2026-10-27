import type { Formula } from './types';

export function totalParts(formula: Formula): number {
  return Object.values(formula).reduce((sum, parts) => sum + parts, 0);
}

/** Each material's share of the formula, in percent. */
export function percentages(formula: Formula): Formula {
  const total = totalParts(formula);
  const result: Formula = {};
  if (total === 0) return result;
  for (const [id, parts] of Object.entries(formula)) result[id] = (parts / total) * 100;
  return result;
}

/** Adds (or with a negative delta, removes) parts; a material at zero leaves the formula. */
export function addParts(formula: Formula, id: string, delta: number): Formula {
  const parts = Math.round(((formula[id] ?? 0) + delta) * 10) / 10;
  const next = { ...formula };
  if (parts > 0) next[id] = parts;
  else delete next[id];
  return next;
}
