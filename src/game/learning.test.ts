import { describe, expect, it } from 'vitest';
import { content, materialsById } from './content';
import { answerQuestion, currentStreak, mastery, newLearningState, nextQuestion, recordUse, revealed, startToday, training } from './learning';
import { seededRandom } from './random';

const bench = ['bergamot', 'lavender', 'labdanum', 'vanillin', 'lemon', 'neroli'].map((id) => materialsById.get(id)!);
const DAY = 20000;

describe('nose training', () => {
  it('asks a handful of questions a day, once a day', () => {
    const s = newLearningState();
    startToday(s, bench, content.families, DAY, seededRandom(1));
    expect(s.today!.questions).toHaveLength(training.questionsPerDay);
    const first = s.today!.questions;
    startToday(s, bench, content.families, DAY, seededRandom(2));
    expect(s.today!.questions).toBe(first);
    for (const q of first) expect(q.options[q.answer]).toBeDefined();
  });

  it('raises mastery on a right answer and resets it on a wrong one', () => {
    const s = newLearningState();
    startToday(s, bench, content.families, DAY, seededRandom(3));
    const q = s.today!.questions[0];
    expect(answerQuestion(s, 0, q.answer, DAY)).toBe(true);
    expect(mastery(s, q.material)).toBe(1);
    expect(answerQuestion(s, 0, q.answer, DAY)).toBeNull(); // already answered
    const q2 = s.today!.questions[1];
    answerQuestion(s, 1, (q2.answer + 1) % q2.options.length, DAY);
    expect(mastery(s, q2.material)).toBe(0);
  });

  it('only asks again once a material is due', () => {
    const s = newLearningState();
    const one = [materialsById.get('bergamot')!, materialsById.get('lavender')!];
    startToday(s, one, content.families, DAY, seededRandom(4));
    s.today!.questions.forEach((q, i) => answerQuestion(s, i, q.answer, DAY));
    startToday(s, one, content.families, DAY + 1, seededRandom(5));
    expect(s.today!.questions.length).toBeGreaterThan(0); // box 1 comes back the next day
    s.today!.questions.forEach((q, i) => answerQuestion(s, i, q.answer, DAY + 1));
    startToday(s, one, content.families, DAY + 2, seededRandom(6));
    expect(s.today!.questions).toHaveLength(0); // box 2 waits two days
    expect(nextQuestion(s)).toBe(-1);
  });

  it('keeps a streak for consecutive days and lets it lapse after a missed day', () => {
    const s = newLearningState();
    for (const day of [DAY, DAY + 1, DAY + 2]) {
      startToday(s, bench, content.families, day, seededRandom(day));
      s.today!.questions.forEach((q, i) => answerQuestion(s, i, q.answer, day));
    }
    expect(s.streak).toBe(3);
    expect(currentStreak(s, DAY + 3)).toBe(3);
    expect(currentStreak(s, DAY + 4)).toBe(0);
  });
});

describe('compendium', () => {
  it('fills in as you use a material, or as you master it', () => {
    const s = newLearningState();
    expect(revealed(s, 'bergamot', 'behaviour')).toBe(false);
    recordUse(s, { bergamot: 6, lavender: 4 });
    expect(revealed(s, 'bergamot', 'behaviour')).toBe(true);
    expect(revealed(s, 'bergamot', 'safety')).toBe(false);
    s.boxes.bergamot = { box: training.reveal.safety.mastery, due: 0 };
    expect(revealed(s, 'bergamot', 'safety')).toBe(true);
  });
});
