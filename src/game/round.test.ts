import { describe, expect, it } from 'vitest';
import { clients } from './clients';
import { newCustomerState, serveAtCounter, tick } from './customers';
import { radarOf, scoreRadar } from './radar';
import { seededRandom } from './random';
import { addDrop, awardExp, cardFor, counter, expLevel, judgeRound, maxLevel, newCounterState, pingMs, solutionFromFormula, tipFor, tipTier, topSpokes, walkInBrief, writtenBrief } from './round';
import { content } from './content';
import { materialsById } from './content';
import { afterCounter, newStoryState, story } from './story';

const bench = ['bergamot', 'lavender', 'labdanum', 'vanillin'];

describe('counter rounds', () => {
  it('turn written formulas into drops: 10-part as they are, 100-part in tenths', () => {
    expect(solutionFromFormula({ bergamot: 6, lavender: 3, labdanum: 1 })).toEqual({ bergamot: 6, lavender: 3, labdanum: 1 });
    expect(solutionFromFormula({ bergamot: 63, lavender: 33, labdanum: 4 })).toEqual({ bergamot: 6, lavender: 3, labdanum: 1 });
  });

  it('make every brief reachable: its own solution scores three stars', () => {
    const rnd = seededRandom(1);
    for (let i = 0; i < 30; i++) {
      const b = walkInBrief(bench, rnd);
      expect(Object.keys(b.solution).every((id) => bench.includes(id))).toBe(true);
      expect(scoreRadar(radarOf(b.solution), b.target).stars).toBe(3);
      expect(b.text).not.toMatch(/[{}]/);
    }
    for (const r of story.requests) expect(scoreRadar(radarOf(writtenBrief(r.brief).solution), writtenBrief(r.brief).target).stars).toBe(3);
  });

  it('show a ghost only for specific briefs; written briefs are specific', () => {
    const rnd = seededRandom(9);
    const briefs = Array.from({ length: 40 }, () => walkInBrief(bench, rnd, { reputation: 8, season: 'Spring', modelStages: [] }));
    expect(briefs.some((b) => b.ghost.length === 0)).toBe(true);
    expect(briefs.some((b) => b.ghost.length === counter.ghostSpokes)).toBe(true);
    expect(writtenBrief(story.requests[0].brief).ghost).toHaveLength(counter.ghostSpokes);
  });

  it('tip by time tier: more the quicker you serve, nothing past the slowest tier', () => {
    const tiers = [...counter.tip.tiers].sort((a, b) => a.withinSeconds - b.withinSeconds);
    expect(tipFor(40, 1000)).toBe(Math.round(40 * tiers[0].share));
    expect(tipFor(40, (tiers[0].withinSeconds + 1) * 1000)).toBe(Math.round(40 * tiers[1].share));
    expect(tipFor(40, 10 * 60_000)).toBe(0);
    expect(tipTier(10 * 60_000)).toBeNull();
  });

  it('fade each test ping faster than the last', () => {
    expect(pingMs(1)).toBeLessThan(pingMs(0));
    expect(pingMs(50)).toBe(counter.ping.minMs);
  });

  it('add and take away drops', () => {
    expect(addDrop({}, 'bergamot', 1)).toEqual({ bergamot: 1 });
    expect(addDrop({ bergamot: 1 }, 'bergamot', -1)).toEqual({});
  });

  it('serve at the counter: pay and reputation now, and the customer leaves', () => {
    const s = newCustomerState(0);
    tick(s, 0, new Set(bench), seededRandom(2));
    const v = s.visits[0];
    const change = serveAtCounter(s, v.id, 'Test', 3, 30, 1000);
    expect(change).toBe(clients.economy.reputationForStars[2]);
    expect(s.money).toBe(30);
    expect(s.visits).toHaveLength(0);
    expect(s.reviews).toHaveLength(1);
  });

  it('recover her page from the counter at three stars, and keep the cause for a retry', () => {
    const request = story.requests.find((r) => r.brief.page)!;
    const st = newStoryState();
    st.requests[request.id] = { status: 'waiting', attempts: 0, dueAt: 0 };
    const visit = { id: 'v', storyId: request.id, name: 'x' } as never;
    expect(afterCounter(st, visit, 2, 'It needed more citrus.', 10)).toBeNull();
    expect(st.requests[request.id].last?.cause).toBe('It needed more citrus.');
    expect(afterCounter(st, visit, 3, null, 20)).toBe(request.brief.page);
  });
});

describe('material EXP', () => {
  it('earns EXP for each material in a served perfume, and reports level-ups', () => {
    const c = newCounterState();
    expect(awardExp(c, { bergamot: 3, lavender: 1 })).toEqual([]);
    const ups = awardExp(c, { bergamot: 2 });
    expect(ups).toEqual([{ id: 'bergamot', level: 2 }]);
    expect(c.exp.lavender).toBe(counter.exp.perServe);
  });

  it('reveals more of a card at each level: ?, direction, strength, then exact vector and volatility', () => {
    const at = (level: number) => cardFor('bergamot', counter.exp.levels[level - 1]);
    expect(at(1).direction).toBeUndefined();
    expect(at(2).direction).toBe('citrus');
    expect(at(2).strength).toBeUndefined();
    expect(at(3).strength).toMatch(/pushes/);
    expect(at(3).vector).toBeUndefined();
    expect(at(maxLevel()).vector).toEqual(materialsById.get('bergamot')!.radar.vector);
    expect(at(maxLevel()).volatility).toMatch(/hour/);
    expect(expLevel(0)).toBe(1);
  });
});

describe('difficulty progression', () => {
  const owned = ['bergamot', 'lavender', 'labdanum', 'vanillin', 'lemon', 'rosemary', 'frankincense', 'benzoin', 'myrrh', 'sweet-orange', 'petitgrain', 'neroli', 'clove', 'rose-damascena', 'patchouli', 'cedarwood-virginia'];
  const ctx = (reputation: number, season = 'Spring') => ({ reputation, season, modelStages: content.model.stages });
  const many = (reputation: number, n = 80, season = 'Spring') => {
    const rnd = seededRandom(reputation * 7 + season.length);
    return Array.from({ length: n }, () => walkInBrief(owned, rnd, ctx(reputation, season)));
  };

  it('starts with simple, vague briefs from the starting materials', () => {
    for (const b of many(0)) {
      expect(Object.keys(b.solution).length).toBeLessThanOrEqual(2);
      expect(Object.keys(b.solution).every((id) => counter.progression.starting.includes(id))).toBe(true);
      expect(b.ghost).toEqual([]);
      expect(b.include ?? b.avoid ?? b.stages).toBeUndefined();
    }
  });

  it('adds must-include, then must-avoid, and both together only late', () => {
    expect(many(8).some((b) => b.include)).toBe(true);
    expect(many(8).some((b) => b.avoid)).toBe(false);
    const mid = many(14);
    expect(mid.some((b) => b.avoid)).toBe(true);
    expect(mid.some((b) => b.include && b.avoid)).toBe(false);
    expect(many(35, 200).some((b) => b.include && b.avoid)).toBe(true);
    for (const b of mid) if (b.avoid) expect(b.solution[b.avoid]).toBeUndefined();
  });

  it('brings time-shifted briefs with an opening and a drydown target, still reachable', () => {
    const shifted = many(20).filter((b) => b.stages);
    expect(shifted.length).toBeGreaterThan(0);
    for (const b of shifted) {
      expect(b.stages!.map((st) => st.id)).toEqual(['opening', 'drydown']);
      expect(judgeRound(b.solution, b).score.stars).toBe(3);
      expect(b.stages![0].target.shape).not.toEqual(b.stages![1].target.shape);
    }
    expect(many(14).some((b) => b.stages)).toBe(false);
  });

  it('caps a broken must-include or must-avoid at one star, and says why', () => {
    const b = many(14).find((x) => x.include)!;
    const without = { ...b.solution };
    delete without[b.include!];
    const j = judgeRound(Object.keys(without).length ? without : { bergamot: 1 }, b);
    expect(j.score.stars).toBe(1);
    expect(j.cause).toMatch(/asked for/);
  });

  it('leans towards the season’s families', () => {
    const share = (season: string, spokes: string[]) => {
      const bs = many(8, 300, season);
      return bs.filter((b) => spokes.includes(topSpokes(b.target, 1)[0])).length / bs.length;
    };
    expect(share('Winter', ['amber', 'gourmand', 'spicy'])).toBeGreaterThan(share('Summer', ['amber', 'gourmand', 'spicy']));
  });
});

