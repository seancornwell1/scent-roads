import { bandText, clients, fillTemplate, type ClientsData } from './clients';
import type { Direction, ScoreResult } from './scoring';

// Turns a score's directions into what the customer says, in perfumer's language and never
// numbers. How specific they are depends on how well they know the perfume:
//   1 · first impression on the wrist: one thing, about the opening, no amounts;
//   2 · the review after wearing it all day: up to two things, with amounts;
//   3 · coming back to try again: up to three things, with amounts.

export type Specificity = 1 | 2 | 3;

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function phrase(d: Direction, specificity: Specificity, variant = 0, data: ClientsData = clients): string {
  const f = data.lines.feedback;
  if (d.kind !== 'family') return f[d.kind][d.want];
  const word = f.families[d.family]?.[d.want] ?? (d.want === 'more' ? `more ${d.family}` : `less ${d.family}`);
  const stage = f.stages[d.stage] ?? d.stage;
  if (specificity === 1) return fillTemplate(f.vague, { Word: cap(word), stage });
  const amount = bandText(f.amounts, d.size);
  const template = f.specific[variant % f.specific.length];
  return fillTemplate(template, { amount, Amount: cap(amount), word, stage });
}

/** What the customer says about a perfume, at a given specificity. */
export function feedbackLines(result: Pick<ScoreResult, 'directions' | 'stars'>, specificity: Specificity, data: ClientsData = clients): string[] {
  let directions = result.directions;
  if (specificity === 1) {
    // On the wrist, only the opening and how loud it is can be judged.
    directions = directions.filter((d) => (d.kind === 'family' && d.stage === 'opening') || d.kind === 'strength');
  }
  const picked = directions.slice(0, specificity);
  if (picked.length === 0) return result.stars >= 3 || specificity > 1 ? [data.lines.feedback.perfect] : [];
  return picked.map((d, i) => phrase(d, specificity, i, data));
}
