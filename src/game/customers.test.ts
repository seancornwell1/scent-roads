import { describe, expect, it } from 'vitest';
import { canAnswer, clients } from './clients';
import { bonusFor, completeReview, handOver, newCustomerState, tick } from './customers';
import { seededRandom } from './random';
import type { ScoreResult } from './scoring';
import { gameHoursToMs, realMinutesToMs } from './time';
import { unlockedMaterialIds } from './unlocks';

const bench = unlockedMaterialIds(0);
const result = (stars: number): ScoreResult => ({
  stages: [], strengthRatio: 1, strengthScore: 1, longevityHours: 8, targetLongevityHours: 8, longevityScore: 1, total: 0.8, stars, impression: 0.8, weakStage: null, directions: [],
});

describe('customer visits', () => {
  it('never bring more than one regular in at a time', () => {
    const s = newCustomerState(0);
    tick(s, realMinutesToMs(60), bench, seededRandom(7));
    expect(s.visits.filter((v) => v.regularId).length).toBeLessThanOrEqual(clients.timing.maxRegularsInShop);
  });

  it('arrive on schedule while the app is closed, up to the shop capacity', () => {
    const s = newCustomerState(0);
    tick(s, realMinutesToMs(60), bench, seededRandom(1));
    expect(s.visits.filter((v) => v.status === 'waiting')).toHaveLength(clients.timing.maxInShop);
  });

  it('only bring briefs you can answer with the materials you have', () => {
    const s = newCustomerState(0);
    const all = [...clients.briefs, ...clients.regulars.flatMap((r) => r.briefs)];
    for (let i = 0; i < 20; i++) {
      tick(s, realMinutesToMs(4 * i), bench, seededRandom(i));
      s.visits = s.visits.filter((v) => v.status === 'waiting').slice(-1);
    }
    for (const v of s.visits) expect(canAnswer(all.find((b) => b.id === v.briefId)!, bench)).toBe(true);
  });

  it('pay on hand-over, return with a review later, and change reputation; 3 stars earns a bonus', () => {
    const s = newCustomerState(0);
    tick(s, 0, bench, seededRandom(2));
    const v = s.visits[0];
    const paid = handOver(s, v.id, { name: 'Test', parts: { bergamot: 10 } }, result(3), 1000);
    expect(paid).toBeGreaterThan(0);
    expect(s.money).toBe(paid);
    expect(v.status).toBe('away');

    tick(s, 1000 + gameHoursToMs(clients.timing.reviewAfterGameHours) - 1, bench, seededRandom(3));
    expect(v.status).toBe('away');
    tick(s, 1000 + gameHoursToMs(clients.timing.reviewAfterGameHours), bench, seededRandom(3));
    expect(v.status).toBe('returning');

    const bonus = bonusFor(v);
    expect(bonus).toBeGreaterThan(0);
    const change = completeReview(s, v.id, 2000);
    expect(change).toBe(clients.economy.reputationForStars[2]);
    expect(s.reputation).toBe(change);
    expect(s.money).toBe(paid + bonus);
    expect(s.visits.find((x) => x.id === v.id)).toBeUndefined();
    expect(s.reviews).toHaveLength(1);
  });

  it('pay no bonus below 3 stars', () => {
    const s = newCustomerState(0);
    tick(s, 0, bench, seededRandom(2));
    const v = s.visits[0];
    handOver(s, v.id, { name: 'Test', parts: { bergamot: 10 } }, result(2), 1000);
    expect(bonusFor(v)).toBe(0);
  });

  it('regulars remember past perfumes and come back for their next brief', () => {
    const s = newCustomerState(0);
    const random = seededRandom(4);
    for (let i = 0; i < 30 && !s.visits.some((v) => v.regularId); i++) {
      s.visits = [];
      tick(s, s.nextArrivalAt, bench, random);
    }
    const regular = s.visits.find((v) => v.regularId);
    expect(regular).toBeDefined();
    const t = s.nextArrivalAt;
    handOver(s, regular!.id, { name: 'Sunday Best', parts: { lavender: 10 } }, result(2), t);
    tick(s, t + gameHoursToMs(clients.timing.reviewAfterGameHours), bench, seededRandom(5));
    completeReview(s, regular!.id, t + gameHoursToMs(clients.timing.reviewAfterGameHours));
    const progress = s.regulars[regular!.regularId!];
    expect(progress.history[0].perfume).toBe('Sunday Best');
    expect(progress.nextBrief).toBe(1);
  });
});
