import { percentages } from './formula';
import type { Accord, Condition, Formula, Material } from './types';

/** Percent of the formula that a requirement's materials, family or layer make up. */
export function conditionShare(condition: Condition, percent: Formula, materials: Map<string, Material>): number {
  let share = 0;
  for (const [id, pct] of Object.entries(percent)) {
    const m = materials.get(id);
    if (!m) continue;
    const matches =
      (condition.materials && condition.materials.includes(id)) ||
      (condition.family !== undefined && m.family === condition.family) ||
      (condition.layer !== undefined && m.layer === condition.layer);
    if (matches) share += pct;
  }
  return share;
}

export function matchesAccord(formula: Formula, accord: Accord, materials: Map<string, Material>): boolean {
  const percent = percentages(formula);
  if (Object.keys(percent).length === 0) return false;
  return accord.requires.every((condition) => {
    const share = conditionShare(condition, percent, materials);
    return share >= (condition.min ?? 0) && share <= (condition.max ?? 100);
  });
}

export function recognizeAccords(formula: Formula, accords: Accord[], materials: Map<string, Material>): Accord[] {
  return accords.filter((accord) => matchesAccord(formula, accord, materials));
}
