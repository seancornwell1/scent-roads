import { describe, expect, it } from 'vitest';
import { clients, validateClients } from './clients';
import { content, materialsById } from './content';
import { applyQuality, scorePerfume } from './scoring';
import { unlocks, unlockedMaterialIds, validateUnlocks, tierIndex, nextTier } from './unlocks';
import type { Formula } from './types';

const families = new Set(content.families.map((f) => f.id));
const moods = new Set(content.families.flatMap((f) => f.moods));
const score = (formula: Formula, briefId: string) => {
  const brief = [...clients.briefs, ...clients.regulars.flatMap((r) => r.briefs)].find((b) => b.id === briefId)!;
  return scorePerfume(formula, brief.target, materialsById, content.families, content.model, clients.scoring);
};

describe('unlocks', () => {
  it('unlock every material exactly once, in increasing reputation', () => {
    expect(validateUnlocks(unlocks, new Set(content.materials.map((m) => m.id)))).toEqual([]);
  });

  it('start with a small bench of four', () => {
    expect([...unlockedMaterialIds(0)].sort()).toEqual(['bergamot', 'labdanum', 'lavender', 'vanillin']);
    expect(tierIndex(0)).toBe(0);
    expect(nextTier(0)?.id).toBe('lift-and-glow');
    expect(unlockedMaterialIds(5).has('hedione')).toBe(true);
  });
});

describe('clients data', () => {
  it('is valid', () => {
    expect(validateClients(clients, families, moods, unlocks.tiers.length)).toEqual([]);
  });

  it('every brief can be met with the materials of its tier', () => {
    for (const b of [...clients.briefs, ...clients.regulars.flatMap((r) => r.briefs)]) {
      const available = unlockedMaterialIds(unlocks.tiers[b.tier].reputation);
      const reachable = new Set([...available].map((id) => materialsById.get(id)!.family));
      const missing = Object.keys(b.target.families).filter((f) => !reachable.has(f));
      expect({ brief: b.id, missing }).toEqual({ brief: b.id, missing: [] });
    }
  });
});

describe('scoring', () => {
  it('a sensible amber pleases "the first cold day"', () => {
    const r = score({ labdanum: 35, vanillin: 30, bergamot: 25, lavender: 10 }, 'first-cold-day');
    expect(r.stars).toBeGreaterThanOrEqual(4);
    expect(r.weakStage).toBeNull();
  });

  it('a bright citrus-herb blend pleases the Sicilian balcony, and an amber does not', () => {
    const fresh = score({ bergamot: 60, lavender: 30, vanillin: 10 }, 'sicilian-balcony');
    const amber = score({ labdanum: 50, vanillin: 50 }, 'sicilian-balcony');
    expect(fresh.total).toBeGreaterThan(amber.total);
    expect(fresh.stars).toBeGreaterThanOrEqual(4);
    expect(amber.stars).toBeLessThanOrEqual(2);
  });

  it('flags a citrus cologne asked to last all evening: it fades fast and misses the brief', () => {
    const r = score({ bergamot: 80, lavender: 20 }, 'library-fire');
    expect(r.longevityHours).toBeLessThan(12);
    expect(r.longevityScore).toBeLessThan(0.5);
    expect(r.weakStage).not.toBeNull();
    expect(r.stars).toBeLessThanOrEqual(2);
  });

  it('rewards better materials and punishes poor ones', () => {
    const r = score({ labdanum: 35, vanillin: 30, bergamot: 25, lavender: 10 }, 'library-fire');
    expect(applyQuality(r, 1.25, 0.25, clients.scoring).total).toBeGreaterThan(r.total);
    expect(applyQuality(r, 0.6, 0.25, clients.scoring).total).toBeLessThan(r.total);
  });

  it('measures strength on a 1–5 scale', () => {
    expect(score({ vanillin: 100 }, 'first-cold-day').strength).toBeGreaterThanOrEqual(2);
    expect(score({ vanillin: 100 }, 'first-cold-day').strength).toBeLessThanOrEqual(5);
  });
});
