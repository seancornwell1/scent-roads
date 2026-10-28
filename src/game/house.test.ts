import { describe, expect, it } from 'vitest';
import { entriesOf } from './blend';
import { clients } from './clients';
import { content } from './content';
import { addCustomLabel, addHousePerfume, fairPrice, house, newHouseState, priceAt, rateHouse, settleHouse, suggestName, unlockBlockers, validateHouse, houseSlots, restock } from './house';
import { newSourcingState } from './sourcing';
import { knownTargets } from './world';

const known = knownTargets();
const stockOf = (ids: string[], grams = 20) => {
  const s = newSourcingState();
  ids.forEach((m, i) => s.inventory.push({ id: `l${i}`, material: m, grams, quality: 1, since: 0 }));
  return s;
};

describe('house perfumes', () => {
  it('have valid data', () => {
    expect(validateHouse(house, new Set(content.families.map((f) => f.id)))).toEqual([]);
  });

  it('unlock with reputation and enough materials in stock to compose freely', () => {
    expect(unlockBlockers(0, stockOf(['bergamot', 'lavender', 'labdanum']))).toHaveLength(2);
    const eight = ['bergamot', 'lavender', 'labdanum', 'vanillin', 'lemon', 'frankincense', 'myrrh', 'benzoin'];
    expect(unlockBlockers(house.unlock.reputation, stockOf(eight))).toEqual([]);
    expect(houseSlots('apprentice', 0)).toBe(1);
    expect(houseSlots('master', 2)).toBeGreaterThan(houseSlots('junior', 0));
  });

  it('rate a well-built perfume above a single material, and a copy of a brief as unoriginal', () => {
    const chypre = entriesOf({ parts: { bergamot: 30, 'rose-damascena': 10, jasmine: 5, labdanum: 20, oakmoss: 15, patchouli: 15, vetiver: 5 }, dilutions: { oakmoss: 1 } });
    const single = entriesOf({ parts: { bergamot: 10 } });
    const good = rateHouse(chypre, known);
    const poor = rateHouse(single, known);
    expect(good.total).toBeGreaterThan(poor.total);
    expect(good.stars).toBeGreaterThanOrEqual(3);
    expect(poor.stars).toBeLessThanOrEqual(2);
    const copy = clients.briefs.find((b) => b.id === 'evening-walk')!;
    expect(rateHouse(entriesOf({ parts: copy.target.formula }), known).scores.originality).toBeLessThan(0.3);
  });

  it('price better perfumes higher, with bargain and premium tiers around the fair price', () => {
    const r = (total: number) => ({ scores: {} as never, total, stars: 3 });
    expect(fairPrice(r(0.9), 1)).toBeGreaterThan(fairPrice(r(0.5), 1));
    const fair = fairPrice(r(0.7), 1);
    expect(priceAt(fair, 'bargain')).toBeLessThan(fair);
    expect(priceAt(fair, 'premium')).toBeGreaterThan(fair);
  });

  it('suggest names from the profile, a different one per seed', () => {
    const blend = entriesOf({ parts: { bergamot: 4, lavender: 3, labdanum: 3 } });
    const names = new Set([1, 2, 3, 4, 5, 6].map((s) => suggestName(blend, s)));
    expect(names.size).toBeGreaterThan(2);
    for (const n of names) expect(n).not.toMatch(/[{}]/);
  });

  it('use stock for bottles, sell over finished days from timestamps, and report each day', () => {
    const stock = stockOf(['bergamot', 'lavender', 'labdanum'], 5);
    const h = newHouseState(0);
    const p = addHousePerfume(h, stock, { name: 'Test', entries: entriesOf({ parts: { bergamot: 4, lavender: 3, labdanum: 3 } }), label: { generic: 'plain' }, tier: 'bargain', bottles: 3 }, 1, known, 1, 0);
    if (typeof p === 'string') throw new Error(p);
    expect(p.bottles).toBe(3);
    expect(stock.inventory.reduce((a, l) => a + l.grams, 0)).toBeCloseTo(12);
    // No more room on one shelf.
    expect(typeof addHousePerfume(h, stock, { name: 'B', entries: p.entries, label: { generic: 'plain' }, tier: 'fair', bottles: 1 }, 1, known, 1, 0)).toBe('string');
    // Nothing is settled until a day has ended; then a report per day.
    expect(settleHouse(h, 23, 5, () => p.price)).toHaveLength(0);
    const reports = settleHouse(h, 24 * 30, 5, () => p.price);
    expect(reports.length).toBe(30);
    expect(p.sold + p.bottles).toBe(3);
    expect(reports.reduce((a, r) => a + r.coins, 0)).toBe(p.coins);
    expect(h.unseen).toBe(30);
    // Settling again changes nothing.
    expect(settleHouse(h, 24 * 30, 5, () => p.price)).toHaveLength(0);
    expect(restock(h, stock, p.id, 100, 24 * 30)).toBe(9); // bergamot runs out first
  });

  it('keep a limited number of uploaded labels, never dropping one in use', () => {
    const h = newHouseState(0);
    const first = addCustomLabel(h, 'data:image/jpeg;base64,AA');
    h.perfumes.push({ id: 'h9', name: 'x', entries: [], label: { custom: first }, rating: { scores: {} as never, total: 0, stars: 1 }, price: 1, tier: 'fair', bottles: 1, sold: 0, coins: 0, listedAt: 0 });
    for (let i = 0; i < house.customLabels.max + 3; i++) addCustomLabel(h, 'data:image/jpeg;base64,BB');
    expect(h.labels.length).toBe(house.customLabels.max);
    expect(h.labels.some((l) => l.id === first)).toBe(true);
  });
});
