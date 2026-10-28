import ranksJson from '../data/ranks.json';
import type { Brief } from './clients';
import { makeQuestion, type LearningState, mastery, type Question } from './learning';
import type { ScoreResult } from './scoring';
import type { Family, Material } from './types';

// Ranks: apprentice, junior perfumer, perfumer, master. Each step up is an exam: blind
// identification (name materials from their descriptions alone), then building a classic
// accord to a brief at the organ. Ranks set how finely you can work (10 or 100 parts),
// whether you can dilute materials and save bases, budget briefs, and pay.

export interface Exam {
  reputation: number;
  /** How many materials must reach a mastery level before you may sit it. */
  mastered: { count: number; level: number };
  identify: { questions: number; pass: number };
  accord: Brief;
}

export interface Rank {
  id: string;
  name: string;
  about: string;
  /** Totals a perfume may have, exactly. */
  wearableParts: number[];
  dilutions: boolean;
  bases: boolean;
  budgets: boolean;
  payMultiplier: number;
  /** The exam to reach this rank (none for the first). */
  exam?: Exam;
}

export const ranks = (ranksJson as unknown as { ranks: Rank[] }).ranks;

export function rankById(id: string | undefined): Rank {
  return ranks.find((r) => r.id === id) ?? ranks[0];
}

export function nextRank(id: string | undefined): Rank | null {
  return ranks[ranks.indexOf(rankById(id)) + 1] ?? null;
}

/** Why you can't sit the next exam yet, or [] if you can. */
export function examBlockers(rank: Rank, reputation: number, learning: LearningState, owned: Material[]): string[] {
  const exam = rank.exam;
  if (!exam) return [];
  const out: string[] = [];
  if (reputation < exam.reputation) out.push(`Reach reputation ${exam.reputation} (you have ${reputation}).`);
  const mastered = owned.filter((m) => mastery(learning, m.id) >= exam.mastered.level).length;
  if (mastered < exam.mastered.count) out.push(`Train your nose: ${exam.mastered.count} materials at mastery ${exam.mastered.level} or more (you have ${mastered}).`);
  const missing = Object.keys(exam.accord.target.formula).filter((id) => !owned.some((m) => m.id === id));
  if (missing.length) out.push('Have every material the exam accord needs.');
  return out;
}

export interface ExamState {
  rank: string;
  questions: Question[];
  answers: (number | null)[];
  /** Set once the accord has been handed in. */
  accord?: ScoreResult;
}

/** Starts an exam: blind identification from among the materials you have. */
export function startExam(rank: Rank, owned: Material[], families: Family[], random: () => number): ExamState {
  const exam = rank.exam!;
  const pool = [...owned].sort(() => random() - 0.5).slice(0, exam.identify.questions);
  return { rank: rank.id, questions: pool.map((m) => makeQuestion(m, 'identify', owned, families, random)), answers: pool.map(() => null) };
}

export function identifyScore(e: ExamState): number {
  return e.questions.filter((q, i) => e.answers[i] === q.answer).length;
}

export type ExamStage = 'identify' | 'failed-identify' | 'accord' | 'passed' | 'failed-accord';

export function examStage(e: ExamState): ExamStage {
  const exam = rankById(e.rank).exam!;
  if (e.answers.some((a) => a === null)) return 'identify';
  if (identifyScore(e) < exam.identify.pass) return 'failed-identify';
  if (!e.accord) return 'accord';
  return e.accord.stars >= 3 ? 'passed' : 'failed-accord';
}

export function validateRanks(list: Rank[], materialIds: Set<string>): string[] {
  const errors: string[] = [];
  list.forEach((r, i) => {
    if (i > 0 && !r.exam) errors.push(`rank "${r.id}": needs an exam`);
    if (!r.wearableParts.length) errors.push(`rank "${r.id}": needs wearableParts`);
    for (const id of Object.keys(r.exam?.accord.target.formula ?? {})) if (!materialIds.has(id)) errors.push(`rank "${r.id}": unknown material "${id}"`);
    if (r.exam && r.exam.identify.pass > r.exam.identify.questions) errors.push(`rank "${r.id}": pass mark above the number of questions`);
  });
  return errors;
}
