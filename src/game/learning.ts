import trainingJson from '../data/training.json';
import { LAYERS, type Family, type Formula, type Layer, type Material } from './types';

// Learning: how often you've used each material, your own smelling notes (the game never
// writes them), and daily nose training. Training is a short spaced-repetition quiz: each
// material sits in a box from 0 to `maxMastery`; a right answer moves it up a box and puts
// off its next question, a wrong one sends it back to 0. The box is your mastery of it.
// Training days are real calendar days, so a streak means coming back each day.

export type QuestionKind = 'identify' | 'family' | 'layer';

export interface TrainingData {
  questionsPerDay: number;
  /** Days until a material is asked again, by the box it has just moved to. */
  intervalsDays: number[];
  maxMastery: number;
  kinds: QuestionKind[];
  prompts: Record<QuestionKind, string>;
  layerNames: Record<Layer, string>;
  /** When each part of a compendium page fills in: after this many uses, or this much mastery. */
  reveal: Record<'behaviour' | 'reference' | 'safety', { uses: number; mastery: number }>;
}

export const training = trainingJson as TrainingData;

export interface Question {
  material: string;
  kind: QuestionKind;
  /** Material ids (identify), family ids (family) or layers (layer). */
  options: string[];
  answer: number;
}

export interface LearningState {
  uses: Record<string, number>;
  notes: Record<string, string>;
  boxes: Record<string, { box: number; due: number }>;
  streak: number;
  /** The last day a training session was finished. */
  lastDay: number | null;
  today: { day: number; questions: Question[]; answers: (number | null)[] } | null;
}

export function newLearningState(): LearningState {
  return { uses: {}, notes: {}, boxes: {}, streak: 0, lastDay: null, today: null };
}

/** A local calendar day as a number (days since 1970), so "tomorrow" is +1. */
export function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

export function mastery(s: LearningState, id: string): number {
  return s.boxes[id]?.box ?? 0;
}

/** Counts a perfume's materials as used (handed over, bottled or saved). */
export function recordUse(s: LearningState, formula: Formula): void {
  for (const [id, parts] of Object.entries(formula)) if (parts > 0) s.uses[id] = (s.uses[id] ?? 0) + 1;
}

export function revealed(s: LearningState, id: string, part: keyof TrainingData['reveal'], data: TrainingData = training): boolean {
  const r = data.reveal[part];
  return (s.uses[id] ?? 0) >= r.uses || mastery(s, id) >= r.mastery;
}

/** The streak as it stands today: it lapses if a whole day was missed. */
export function currentStreak(s: LearningState, day: number): number {
  return s.lastDay !== null && s.lastDay >= day - 1 ? s.streak : 0;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeQuestion(m: Material, kind: QuestionKind, owned: Material[], families: Family[], random: () => number): Question {
  let correct: string;
  let others: string[];
  if (kind === 'identify') {
    correct = m.id;
    others = shuffle(owned.filter((x) => x.id !== m.id).map((x) => x.id), random).slice(0, 3);
  } else if (kind === 'family') {
    correct = m.family;
    others = shuffle(families.filter((f) => f.id !== m.family).map((f) => f.id), random).slice(0, 3);
  } else {
    correct = m.layer;
    others = LAYERS.filter((l) => l !== m.layer);
  }
  const options = kind === 'layer' ? [...LAYERS] : shuffle([correct, ...others], random);
  return { material: m.id, kind, options, answer: options.indexOf(correct) };
}

/**
 * Today's questions, made once per day from the materials you have: those due first, least
 * mastered first. Identifying needs at least two materials to choose from.
 */
export function startToday(s: LearningState, owned: Material[], families: Family[], day: number, random: () => number, data: TrainingData = training): void {
  if (s.today?.day === day) return;
  const due = owned.filter((m) => (s.boxes[m.id]?.due ?? 0) <= day);
  const picked = shuffle(due, random)
    .sort((a, b) => mastery(s, a.id) - mastery(s, b.id))
    .slice(0, data.questionsPerDay);
  const questions = picked.map((m, i) => {
    let kind = data.kinds[(mastery(s, m.id) + i) % data.kinds.length];
    if (kind === 'identify' && owned.length < 2) kind = 'layer';
    return makeQuestion(m, kind, owned, families, random);
  });
  s.today = { day, questions, answers: questions.map(() => null) };
}

/** Answers today's next question. Returns whether it was right. */
export function answerQuestion(s: LearningState, index: number, choice: number, day: number, data: TrainingData = training): boolean | null {
  const t = s.today;
  if (!t || t.day !== day || t.answers[index] !== null || !t.questions[index]) return null;
  const q = t.questions[index];
  t.answers[index] = choice;
  const right = choice === q.answer;
  const box = right ? Math.min(mastery(s, q.material) + 1, data.maxMastery) : 0;
  s.boxes[q.material] = { box, due: day + data.intervalsDays[Math.min(box, data.intervalsDays.length - 1)] };
  if (t.answers.every((a) => a !== null)) {
    // A finished session keeps the streak going (once per day).
    if (s.lastDay !== day) s.streak = s.lastDay === day - 1 ? s.streak + 1 : 1;
    s.lastDay = day;
  }
  return right;
}

/** The next unanswered question today, or -1 when done (or there's nothing to ask). */
export function nextQuestion(s: LearningState): number {
  return s.today ? s.today.answers.findIndex((a) => a === null) : -1;
}
