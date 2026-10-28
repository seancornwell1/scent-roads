import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { arrivalMultiplier, generateWeek, priceMultiplier, weekOf, yieldMultiplier, type NewsContext } from './events';
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

describe('display pieces', () => {
  it('add places for house perfumes once placed', () => {
    const u = newUpgradeState();
    expect(displayCapacity(u)).toBe(0);
    buyItem(u, { money: 999 }, 'signature-shelf', 0);
    place(u, 'signature-shelf', 'spot-1', 'floor');
    expect(displayCapacity(u)).toBe(3);
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
