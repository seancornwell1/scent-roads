import { blendCost, overdosed, partsTotal, safetyIssues, type Entry, type SafetyIssue } from './blend';
import { content, materialsById } from './content';

// The checks a perfume must pass before it can be sold (handed over or bottled): the right
// number of parts for your rank, every material within its safety limit, and, when a
// customer sets one, within their budget. Harsh materials are a warning, not a block:
// the customer will smell it.

export interface PerfumeCheck {
  total: number;
  /** Totals your rank allows. */
  allowed: number[];
  totalOk: boolean;
  safety: SafetyIssue[];
  harsh: string[];
  /** Euros per 100 g of concentrate. */
  cost: number;
  budget?: number;
  overBudget: boolean;
}

export function checkPerfume(blend: Entry[], allowed: number[], budget?: number): PerfumeCheck {
  const total = Math.round(partsTotal(blend) * 1000) / 1000;
  const cost = blendCost(blend, materialsById);
  return {
    total,
    allowed,
    totalOk: allowed.includes(total),
    safety: safetyIssues(blend, materialsById, content.model),
    harsh: overdosed(blend, materialsById, content.model),
    cost,
    budget,
    overBudget: budget !== undefined && cost > budget,
  };
}

export function sellable(c: PerfumeCheck): boolean {
  return c.totalOk && c.safety.length === 0 && !c.overBudget;
}

/** Why it can't be sold, in plain words (empty if it can). */
export function blockers(c: PerfumeCheck): string[] {
  const out: string[] = [];
  if (!c.totalOk) out.push(`A perfume totals exactly ${c.allowed.join(' or ')} parts; this has ${c.total}.`);
  for (const s of c.safety) out.push(`${materialsById.get(s.material)?.name ?? s.material} is over its safety limit (${s.finishedPercent.toFixed(2)}% of the finished perfume; at most ${s.limit}%). Use less, or dilute it.`);
  if (c.overBudget) out.push(`It costs €${c.cost.toFixed(2)} per 100 g, over their budget of €${c.budget}.`);
  return out;
}
