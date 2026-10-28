import { describe, expect, it } from 'vitest';
import { clients, findBrief, validateClients } from './clients';
import { content, materialsById } from './content';
import { feedbackLines } from './feedback';
import { applyQuality, scorePerfume } from './scoring';
import { story } from './story';
import { unlocks, unlockedMaterialIds, validateUnlocks, tierIndex, nextTier } from './unlocks';
import type { Formula } from './types';

const materialIds = new Set(content.materials.map((m) => m.id));
const families = new Set(content.families.map((f) => f.id));
const storyMaterials = new Set(story.requests.flatMap((r) => (r.gives ?? []).map((g) => g.material)));
const score = (formula: Formula, briefId: string) => scorePerfume(formula, findBrief(briefId)!.target, materialsById, content.model, clients.scoring);

describe('unlocks', () => {
  it('unlock every material exactly once (or through the story), in increasing reputation', () => {
    expect(validateUnlocks(unlocks, materialIds, storyMaterials)).toEqual([]);
  });

  it('start with her bench of three; vanillin comes from the story', () => {
    expect([...unlockedMaterialIds(0)].sort()).toEqual(['bergamot', 'labdanum', 'lavender']);
    expect(storyMaterials.has('vanillin')).toBe(true);
    expect(tierIndex(0)).toBe(0);
    expect(nextTier(0)?.id).toBe('lift-and-glow');
    expect(unlockedMaterialIds(5).has('hedione')).toBe(true);
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
      const r = score(b.target.formula, b.id);
      expect(r.total).toBeCloseTo(1, 5);
      expect(r.stars).toBe(3);
      expect(r.directions).toEqual([]);
    }
  });

  it('forgives a part either way, but not a different material', () => {
    expect(score({ bergamot: 5, lavender: 4, labdanum: 1 }, 'agathe-wedding').stars).toBe(3);
    expect(score({ labdanum: 5, vanillin: 3, lavender: 2 }, 'henri-amber').stars).toBe(2);
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
