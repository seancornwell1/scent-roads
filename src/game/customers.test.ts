import { describe, expect, it } from 'vitest';
import { clients } from './clients';
import { completeReview, handOver, newCustomerState, tick } from './customers';
import { seededRandom } from './random';
import type { ScoreResult } from './scoring';
import { gameHoursToMs, realMinutesToMs } from './time';

const result = (stars: number): ScoreResult => ({
  stages: [], mood: 1, strength: 3, strengthScore: 1, longevityHours: 8, longevityScore: 1, total: 0.8, stars, impression: 0.8, weakStage: null,
});

describe('customer visits', () => {
  it('never bring more than one regular in at a time', () => {
    const s = newCustomerState(0);
    tick(s, realMinutesToMs(60), 0, seededRandom(7));
    expect(s.visits.filter((v) => v.regularId).length).toBeLessThanOrEqual(clients.timing.maxRegularsInShop);
  });

  it('arrive on schedule while the app is closed, up to the shop capacity', () => {
    const s = newCustomerState(0);
    tick(s, realMinutesToMs(60), 0, seededRandom(1));
    expect(s.visits.filter((v) => v.status === 'waiting')).toHaveLength(clients.timing.maxInShop);
  });

  it('only bring briefs from unlocked tiers', () => {
    const s = newCustomerState(0);
    for (let i = 0; i < 20; i++) {
      tick(s, realMinutesToMs(4 * i), 0, seededRandom(i));
      s.visits = s.visits.filter((v) => v.status === 'waiting').slice(-1);
    }
    const tierOf = new Map([...clients.briefs, ...clients.regulars.flatMap((r) => r.briefs)].map((b) => [b.id, b.tier]));
    for (const v of s.visits) expect(tierOf.get(v.briefId)).toBe(0);
  });

  it('pay on hand-over, return with a review later, and change reputation', () => {
    const s = newCustomerState(0);
    tick(s, 0, 0, seededRandom(2));
    const v = s.visits[0];
    const paid = handOver(s, v.id, { name: 'Test', parts: { bergamot: 1 } }, result(5), 1000);
    expect(paid).toBeGreaterThan(0);
    expect(s.money).toBe(paid);
    expect(v.status).toBe('away');

    tick(s, 1000 + gameHoursToMs(clients.timing.reviewAfterGameHours) - 1, 0, seededRandom(3));
    expect(v.status).toBe('away');
    tick(s, 1000 + gameHoursToMs(clients.timing.reviewAfterGameHours), 0, seededRandom(3));
    expect(v.status).toBe('returning');

    const change = completeReview(s, v.id, 2000);
    expect(change).toBe(clients.economy.reputationForStars[4]);
    expect(s.reputation).toBe(change);
    expect(s.visits.find((x) => x.id === v.id)).toBeUndefined();
    expect(s.reviews).toHaveLength(1);
  });

  it('regulars remember past perfumes and come back for their next brief', () => {
    const s = newCustomerState(0);
    const random = seededRandom(4);
    for (let i = 0; i < 30 && !s.visits.some((v) => v.regularId); i++) {
      s.visits = [];
      tick(s, s.nextArrivalAt, 0, random);
    }
    const regular = s.visits.find((v) => v.regularId);
    expect(regular).toBeDefined();
    const t = s.nextArrivalAt;
    handOver(s, regular!.id, { name: 'Sunday Best', parts: { vanillin: 1 } }, result(4), t);
    tick(s, t + gameHoursToMs(clients.timing.reviewAfterGameHours), 0, seededRandom(5));
    completeReview(s, regular!.id, t + gameHoursToMs(clients.timing.reviewAfterGameHours));
    const progress = s.regulars[regular!.regularId!];
    expect(progress.history[0].perfume).toBe('Sunday Best');
    expect(progress.nextBrief).toBe(1);
  });
});
