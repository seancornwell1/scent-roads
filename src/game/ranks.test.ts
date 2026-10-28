import { describe, expect, it } from 'vitest';
import { content, materialsById } from './content';
import { newLearningState } from './learning';
import { examBlockers, examStage, identifyScore, nextRank, rankById, ranks, scoringFor, startExam, validateRanks } from './ranks';
import { scorePerfume } from './scoring';
import { rankAllows } from './world';
import type { SaveData } from './save';
import { seededRandom } from './random';
import type { ScoreResult } from './scoring';
import { blendProfile, briefWeight, recordStyle, regularWelcome, shopStyle } from './style';
import { entriesOf } from './blend';
import { clients } from './clients';

const owned = ['bergamot', 'lavender', 'labdanum', 'vanillin', 'lemon', 'neroli'].map((id) => materialsById.get(id)!);

describe('ranks', () => {
  it('are valid, and climb from 10 parts to 100 with dilutions', () => {
    expect(validateRanks(ranks, new Set(content.materials.map((m) => m.id)))).toEqual([]);
    expect(rankById(undefined).id).toBe('apprentice');
    expect(rankById('apprentice').wearableParts).toEqual([10]);
    expect(nextRank('apprentice')?.wearableParts).toContain(100);
    expect(nextRank('apprentice')?.dilutions).toBe(true);
    expect(nextRank('master')).toBeNull();
  });

  it('let you sit an exam once you have the reputation and the mastery', () => {
    const junior = nextRank('apprentice')!;
    const learning = newLearningState();
    expect(examBlockers(junior, 0, learning, owned).length).toBe(2);
    for (const m of owned) learning.boxes[m.id] = { box: 1, due: 0 };
    expect(examBlockers(junior, 10, learning, owned)).toEqual([]);
  });

  it('are passed by naming enough materials blind, then making the accord at three stars', () => {
    const e = startExam(nextRank('apprentice')!, owned, content.families, seededRandom(1));
    expect(examStage(e)).toBe('identify');
    e.questions.forEach((q, i) => (e.answers[i] = q.answer));
    expect(identifyScore(e)).toBe(e.questions.length);
    expect(examStage(e)).toBe('accord');
    e.accord = { stars: 2 } as ScoreResult;
    expect(examStage(e)).toBe('failed-accord');
    e.accord = { stars: 3 } as ScoreResult;
    expect(examStage(e)).toBe('passed');
  });

  it('are failed by naming too few', () => {
    const e = startExam(nextRank('apprentice')!, owned, content.families, seededRandom(2));
    e.questions.forEach((q, i) => (e.answers[i] = (q.answer + 1) % q.options.length));
    expect(examStage(e)).toBe('failed-identify');
  });
});

describe('shop style', () => {
  it('follows what you hand over, and draws briefs like it', () => {
    const history: Record<string, number>[] = [];
    const floral = blendProfile(entriesOf({ parts: { 'rose-damascena': 6, jasmine: 4 } }), materialsById, content.model);
    for (let i = 0; i < 10; i++) recordStyle(history, floral);
    expect(history.length).toBe(clients.style.historySize);
    const style = shopStyle(history);
    expect(style.floral).toBeGreaterThan(0.9);
    const roseLean = blendProfile(entriesOf({ parts: { 'rose-damascena': 10 } }), materialsById, content.model);
    const woodLean = blendProfile(entriesOf({ parts: { 'cedarwood-virginia': 10 } }), materialsById, content.model);
    expect(briefWeight(roseLean, style)).toBeGreaterThan(briefWeight(woodLean, style));
  });

  it('brings some regulars only to a shop that leans their way', () => {
    const celeste = clients.regulars.find((r) => r.id === 'celeste')!;
    expect(regularWelcome(celeste, {})).toBe(false);
    expect(regularWelcome(celeste, { floral: 0.5 })).toBe(true);
    expect(regularWelcome(clients.regulars.find((r) => r.id === 'odile')!, {})).toBe(true);
  });
});

describe('stricter judging with rank', () => {
  it('raises the star thresholds at every rank, and from junior asks for 100 parts', () => {
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i].stars[1]).toBeGreaterThan(ranks[i - 1].stars[1]);
      expect(ranks[i].orderParts).toContain(100);
    }
    expect(rankById('apprentice').orderParts).toEqual([10]);
  });

  it('a nearly right perfume earns three stars from an apprentice but not from a master', () => {
    const brief = clients.briefs.find((b) => b.id === 'temple-garden')!;
    const f = { ...brief.target.formula };
    const [a, b] = Object.keys(f);
    f[a] -= 8;
    f[b] += 8;
    const blend = entriesOf({ parts: f, dilutions: brief.target.dilutions });
    const stars = (id: string) => scorePerfume(blend, brief.target, materialsById, content.model, scoringFor(rankById(id), clients.scoring)).stars;
    expect(stars('apprentice')).toBe(3);
    expect(stars('master')).toBeLessThan(3);
  });

  it('keeps briefs written in 100 parts for ranks that work in 100 parts', () => {
    const late = clients.briefs.find((b) => Object.values(b.target.formula).reduce((x, y) => x + y, 0) === 100 && !b.target.dilutions && b.budget === undefined)!;
    const save = { rank: 'apprentice' } as SaveData;
    expect(rankAllows(save, late)).toBe(false);
    expect(rankAllows({ ...save, rank: 'junior' }, late)).toBe(true);
  });
});
