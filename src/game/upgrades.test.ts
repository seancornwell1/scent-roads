import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bottlePrice, listPerfume, newDisplayState, settleSales } from './display';
import { arrivalMultiplier, generateWeek, priceMultiplier, weekOf, yieldMultiplier, type NewsContext } from './events';
import { newSourcingState, order, tickSourcing, unpack } from './sourcing';
import { unlockedMaterialIds } from './unlocks';
import { entriesOf } from './blend';
import {
  appealLevel,
  appealOf,
  buyItem,
  buyProcess,
  displayCapacity,
  furniture,
  inStorage,
  newUpgradeState,
  place,
  processStats,
  unplace,
} from './upgrades';

/** Her bench, plus the vanillin Josette brings back in week 1. */
const owned = new Set([...unlockedMaterialIds(0), 'vanillin']);

describe('furniture data', () => {
  it('every model is downloaded and every kind is named', () => {
    for (const item of furniture.items) {
      expect(existsSync(new URL(`../../assets/${item.model}`, import.meta.url))).toBe(true);
      expect(furniture.kinds[item.kind]).toBeDefined();
    }
  });
});

describe('furniture and appeal', () => {
  it('buy into storage, place on a matching spot, and raise appeal', () => {
    const u = newUpgradeState();
    const wallet = { money: 200 };
    expect(buyItem(u, wallet, 'fern', 0)).toBeNull();
    expect(wallet.money).toBe(175);
    expect(inStorage(u, 'fern')).toBe(1);
    expect(place(u, 'fern', 'counter-left-end', 'surface')).toMatch(/floor/);
    expect(place(u, 'fern', 'spot-1', 'floor')).toBeNull();
    expect(inStorage(u, 'fern')).toBe(0);
    expect(appealOf(u)).toBe(3);
    unplace(u, 'spot-1');
    expect(appealOf(u)).toBe(0);
    expect(inStorage(u, 'fern')).toBe(1);
  });

  it('gate fancy pieces by reputation', () => {
    expect(buyItem(newUpgradeState(), { money: 999 }, 'sofa', 0)).toMatch(/reputation/);
  });

  it('a more appealing shop pays more and expects more', () => {
    const humble = appealLevel(0);
    const renowned = appealLevel(40);
    expect(renowned.payMultiplier).toBeGreaterThan(humble.payMultiplier);
    expect(renowned.strictness).toBeGreaterThan(humble.strictness);
  });
});

describe('processing', () => {
  it('own the basic methods, buy the rest, and upgrade for quality and speed', () => {
    const u = newUpgradeState();
    expect(processStats(u, 'steam-distillation').owned).toBe(true);
    expect(processStats(u, 'co2-extraction').owned).toBe(false);
    const before = processStats(u, 'steam-distillation');
    expect(buyProcess(u, { money: 999 }, 'steam-distillation', 10)).toBeNull();
    const after = processStats(u, 'steam-distillation');
    expect(after.quality).toBeGreaterThan(before.quality);
    expect(after.gameHours).toBeLessThan(before.gameHours);
  });
});

describe('display case', () => {
  const stocked = () => {
    const s = newSourcingState();
    for (const m of ['vanillin', 'labdanum', 'bergamot']) order(s, { money: 999 }, m, m !== 'vanillin', 0, owned);
    for (const c of tickSourcing(s, 100)) unpack(s, c.id, 100);
    return s;
  };

  it('needs a display case placed', () => {
    const u = newUpgradeState();
    expect(displayCapacity(u)).toBe(0);
    buyItem(u, { money: 999 }, 'signature-shelf', 0);
    place(u, 'signature-shelf', 'spot-1', 'floor');
    expect(displayCapacity(u)).toBe(3);
    expect(listPerfume(newDisplayState(), stocked(), { name: 'x', entries: entriesOf({ parts: { vanillin: 1 } }) }, 1, 0, 100, 1)).toMatch(/display case/);
  });

  it('bottles use stock, and sell while you are away', () => {
    const d = newDisplayState();
    const s = stocked();
    expect(listPerfume(d, s, { name: 'Amber', entries: entriesOf({ parts: { vanillin: 35, labdanum: 35, bergamot: 30 } }) }, 3, 3, 100, 1)).toBeNull();
    const price = d.listings[0].price;
    expect(price).toBeGreaterThan(0);
    expect(settleSales(d, 100 + 19, 20)).toEqual({ bottles: 0, coins: 0 });
    expect(settleSales(d, 100 + 45, 20)).toEqual({ bottles: 2, coins: 2 * price });
    expect(settleSales(d, 100 + 1000, 20)).toEqual({ bottles: 1, coins: price });
    expect(d.listings).toHaveLength(0);
  });

  it('prices well-built perfumes higher', () => {
    expect(bottlePrice(entriesOf({ parts: { vanillin: 35, labdanum: 35, bergamot: 30 } }), 1, 1)).toBeGreaterThan(bottlePrice(entriesOf({ parts: { bergamot: 1 } }), 1, 1));
  });
});

describe('newspaper', () => {
  const ctx: NewsContext = {
    crops: [{ region: 'calabria', regionName: 'Calabria', material: 'bergamot', materialName: 'Bergamot' }],
    materials: [{ id: 'vanillin', name: 'Vanillin' }],
  };

  it('is the same for the same week and seed', () => {
    expect(generateWeek(3, 42, ctx)).toEqual(generateWeek(3, 42, ctx));
    expect(weekOf(24 * 7 * 3 + 5)).toBe(3);
  });

  it('turns headlines into effects', () => {
    const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((w) => generateWeek(w, 1, ctx));
    expect(items.length).toBeGreaterThan(5);
    for (const n of items) expect(n.headline).not.toMatch(/\{/);
    const bumper = items.find((n) => n.type === 'bumper');
    if (bumper) expect(yieldMultiplier([bumper], 'calabria', 'bergamot')).toBe(1.5);
    const fair = items.find((n) => n.type === 'fair');
    if (fair) expect(arrivalMultiplier([fair])).toBeLessThan(1);
    expect(priceMultiplier([], 'vanillin')).toBe(1);
  });
});
