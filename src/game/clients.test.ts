import { describe, expect, it } from 'vitest';
import { clients, findBrief, validateClients } from './clients';
import { content, materialsById } from './content';
import { feedbackLines } from './feedback';
import { entriesOf, overdosed, safetyIssues } from './blend';
import { applyQuality, scorePerfume } from './scoring';
import { story } from './story';
import { unlocks, unlockedMaterialIds, validateUnlocks, tierIndex, nextTier } from './unlocks';
import type { Formula } from './types';

const materialIds = new Set(content.materials.map((m) => m.id));
const families = new Set(content.families.map((f) => f.id));
const storyMaterials = new Set(story.requests.flatMap((r) => (r.gives ?? []).map((g) => g.material)));
const score = (formula: Formula, briefId: string, dilutions?: Record<string, 100 | 10 | 1>) =>
  scorePerfume(entriesOf({ parts: formula, dilutions }), findBrief(briefId)!.target, materialsById, content.model, clients.scoring);

describe('unlocks', () => {
  it('unlock every material exactly once (or through the story), in increasing reputation', () => {
    expect(validateUnlocks(unlocks, materialIds, storyMaterials)).toEqual([]);
  });

  it('start with her bench of three; vanillin comes from the story', () => {
    expect([...unlockedMaterialIds(0)].sort()).toEqual(['bergamot', 'labdanum', 'lavender']);
    expect(storyMaterials.has('vanillin')).toBe(true);
    expect(tierIndex(0)).toBe(0);
    expect(nextTier(0)?.id).toBe('waters-and-resins');
    expect(unlockedMaterialIds(4).has('lemon')).toBe(true);
  });

  it('unlock in roughly historical order: each tier is no older than the one before, on average', () => {
    const years = unlocks.tiers.slice(1).map((t) => {
      const ys = t.materials.map((id) => materialsById.get(id)!.ref.year);
      return ys.reduce((a, b) => a + b, 0) / ys.length;
    });
    for (let i = 1; i < years.length; i++) expect(years[i]).toBeGreaterThanOrEqual(years[i - 1] - 50);
  });
});

describe('clients data', () => {
  it('is valid: every target is a whole-part formula of exactly 10 parts', () => {
    expect(validateClients(clients, materialIds, content.model.wearableParts, families)).toEqual([]);
  });

  it('has walk-in briefs you can answer before vanillin arrives', () => {
    const bench = unlockedMaterialIds(0);
    expect(clients.briefs.filter((b) => Object.keys(b.target.formula).every((m) => bench.has(m))).length).toBeGreaterThanOrEqual(2);
  });
});

describe('scoring', () => {
  it('scores the hidden formula itself as a perfect match, with nothing to change', () => {
    for (const b of clients.briefs) {
      const r = score(b.target.formula, b.id, b.target.dilutions);
      expect(r.total).toBeCloseTo(1, 5);
      expect(r.stars).toBe(3);
      expect(r.directions).toEqual([]);
    }
  });

  it('forgives a part either way, but not a different material', () => {
    expect(score({ bergamot: 5, lavender: 4, labdanum: 1 }, 'agathe-wedding').stars).toBe(3);
    expect(score({ labdanum: 5, vanillin: 3, lavender: 2 }, 'henri-amber').stars).toBe(2);
  });

  it('marks a strong material used neat as harsh, and diluting it fixes that', () => {
    const neat = score({ 'beta-damascone': 1, 'gamma-decalactone': 3, 'black-tea': 3, labdanum: 2, 'cedarwood-virginia': 1 }, 'autumn-orchard');
    expect(neat.harsh).toEqual(['beta-damascone']);
    expect(feedbackLines(neat, 2)[0]).toBe(clients.lines.feedback.harsh.less);
    const diluted = score({ 'beta-damascone': 1, 'gamma-decalactone': 3, 'black-tea': 3, labdanum: 2, 'cedarwood-virginia': 1 }, 'autumn-orchard', { 'beta-damascone': 1 });
    expect(diluted.harsh).toEqual([]);
    expect(diluted.stars).toBe(3);
  });

  it('judges proportions, so 100 parts score like 10', () => {
    expect(score({ bergamot: 60, lavender: 30, labdanum: 10 }, 'agathe-wedding').total).toBeCloseTo(1, 5);
  });

  it('gives 1 star to something nothing like it', () => {
    expect(score({ labdanum: 5, vanillin: 5 }, 'sicilian-balcony').stars).toBe(1);
  });

  it('rewards better materials and punishes poor ones', () => {
    const r = score({ labdanum: 4, vanillin: 4, bergamot: 2 }, 'library-fire');
    expect(applyQuality(r, 1.25, 0.25, clients.scoring).total).toBeGreaterThan(r.total);
    expect(applyQuality(r, 0.6, 0.25, clients.scoring).total).toBeLessThan(r.total);
  });
});

describe('targets', () => {
  it('are all sellable: within every safety limit, with no strong material used too strong', async () => {
    const { story } = await import('./story');
    const { ranks } = await import('./ranks');
    const all = [
      ...clients.briefs,
      ...clients.regulars.flatMap((r) => r.briefs),
      ...story.requests.map((r) => r.brief),
      ...ranks.flatMap((r) => (r.exam ? [r.exam.accord] : [])),
    ];
    for (const b of all) {
      const blend = entriesOf({ parts: b.target.formula, dilutions: b.target.dilutions });
      expect({ id: b.id, safety: safetyIssues(blend, materialsById, content.model), harsh: overdosed(blend, materialsById, content.model) }).toEqual({ id: b.id, safety: [], harsh: [] });
    }
  });

  it('with a budget, cost less than it', async () => {
    const { blendCost } = await import('./blend');
    for (const b of [...clients.briefs, ...clients.regulars.flatMap((r) => r.briefs)].filter((x) => x.budget !== undefined)) {
      expect(blendCost(entriesOf({ parts: b.target.formula, dilutions: b.target.dilutions }), materialsById)).toBeLessThan(b.budget!);
    }
  });
});

describe('feedback', () => {
  it('is directional and never uses numbers', () => {
    const r = score({ bergamot: 2, lavender: 7, labdanum: 1 }, 'agathe-wedding');
    for (const level of [1, 2, 3] as const) for (const line of feedbackLines(r, level)) expect(line).not.toMatch(/\d/);
  });

  it('on the wrist, says one thing about the opening: "brighter at the start"', () => {
    const r = score({ bergamot: 2, lavender: 7, labdanum: 1 }, 'agathe-wedding');
    expect(feedbackLines(r, 1)).toEqual(['Brighter at the start, I think.']);
  });

  it('notices too much sweetness', () => {
    const r = score({ labdanum: 3, vanillin: 6, bergamot: 1 }, 'henri-amber');
    expect(feedbackLines(r, 2).join(' ')).toMatch(/less sweet/);
  });

  it('says a cologne asked to last all evening was gone by lunchtime', () => {
    const r = score({ bergamot: 8, lavender: 2 }, 'library-fire');
    expect(feedbackLines(r, 3)).toContain(clients.lines.feedback.longevity.more);
  });

  it('gets more specific: one remark, then up to two, then up to three', () => {
    const r = score({ bergamot: 3, lavender: 3, labdanum: 4 }, 'agathe-wedding');
    expect(feedbackLines(r, 1).length).toBe(1);
    expect(feedbackLines(r, 2).length).toBe(2);
    expect(feedbackLines(r, 3).length).toBe(3);
  });
});
