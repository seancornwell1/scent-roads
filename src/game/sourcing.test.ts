import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dateAt, gameNow, newClock, realMsPerGameHour, setClockSpeed } from './clock';
import { content } from './content';
import {
  consume,
  harvest,
  harvestQuality,
  inSeason,
  lotQuality,
  newSourcingState,
  order,
  processes,
  regions,
  shippingGameHours,
  signContract,
  stockOf,
  tickSourcing,
  unpack,
  validateSourcing,
  cropOf,
} from './sourcing';
import { unlockedMaterialIds } from './unlocks';

const all = new Set(content.materials.map((m) => m.id));
// Game hour 0 is 1 March. These are game-hour timestamps for days in other months.
const MARCH = 0;
const DECEMBER = 24 * (31 + 30 + 31 + 30 + 31 + 31 + 30 + 31 + 30 + 5);
const JULY = 24 * (31 + 30 + 31 + 30 + 5);
const owned = { owned: true, quality: 1.05, gameHours: 6 };

/** Her bench, plus the vanillin Josette brings back in week 1. */
const ownedMaterials = new Set([...unlockedMaterialIds(0), 'vanillin']);

describe('sourcing data', () => {
  it('is valid: every crop is a known material and everything has a price', () => {
    expect(validateSourcing(all)).toEqual([]);
  });

  it('lists every unverified crop fact in docs/FACT_CHECK.md', () => {
    const factCheck = readFileSync(new URL('../../docs/FACT_CHECK.md', import.meta.url), 'utf8');
    for (const r of regions) for (const c of r.crops) if (!c.verified) expect(factCheck).toContain(`\`${r.id}/${c.material}\``);
    for (const p of processes) if (!p.verified) expect(factCheck).toContain(`\`${p.id}\``);
  });
});

describe('clock and calendar', () => {
  it('runs on real time and re-anchors when the speed changes, without jumping', () => {
    const clock = newClock(0);
    expect(gameNow(clock, realMsPerGameHour() * 5)).toBeCloseTo(5);
    setClockSpeed(clock, 60, realMsPerGameHour() * 5);
    expect(gameNow(clock, realMsPerGameHour() * 5)).toBeCloseTo(5);
    expect(gameNow(clock, realMsPerGameHour() * 6)).toBeCloseTo(65);
  });

  it('starts on 1 March and turns the year', () => {
    expect(dateAt(0, { month: 3, day: 1 })).toEqual({ month: 3, day: 1, year: 1 });
    expect(dateAt(24 * 365, { month: 3, day: 1 })).toEqual({ month: 3, day: 1, year: 2 });
    expect(dateAt(DECEMBER, { month: 3, day: 1 }).month).toBe(12);
  });
});

describe('harvest contracts', () => {
  it('only sign in season', () => {
    const bergamot = cropOf('calabria', 'bergamot')!;
    expect(inSeason(bergamot, MARCH)).toBe(true);
    expect(inSeason(bergamot, JULY)).toBe(false);
    const s = newSourcingState();
    const wallet = { money: 100 };
    expect(signContract(s, wallet, 'calabria', 'bergamot', JULY, ownedMaterials)).toBe('Out of season.');
    expect(signContract(s, wallet, 'calabria', 'bergamot', DECEMBER, ownedMaterials)).toBeNull();
    expect(wallet.money).toBe(100 - bergamot.cost);
  });

  it('give top quality inside the best window and less when picked late', () => {
    const s = newSourcingState();
    signContract(s, { money: 100 }, 'calabria', 'bergamot', MARCH, ownedMaterials);
    const c = s.contracts[0];
    expect(harvestQuality(c, c.ripeAt)).toBe(1);
    expect(harvestQuality(c, c.bestUntil + 1)).toBeLessThan(1);
    expect(harvestQuality(c, c.spoiledAt + 100)).toBeCloseTo(0.55);
  });

  it("can't be harvested before they ripen, and only with a suitable method", () => {
    const s = newSourcingState();
    const wallet = { money: 100 };
    signContract(s, wallet, 'calabria', 'bergamot', MARCH, ownedMaterials);
    const c = s.contracts[0];
    expect(harvest(s, wallet, c.id, 'cold-pressing', c.ripeAt - 1, owned)).toBe('Not ripe yet.');
    expect(harvest(s, wallet, c.id, 'steam-distillation', c.ripeAt, owned)).toMatch(/doesn't suit/);
    expect(harvest(s, wallet, c.id, 'cold-pressing', c.ripeAt, owned)).toBeNull();
  });

  it('process, ship by distance, and arrive as a crate that unpacks into stock', () => {
    const s = newSourcingState();
    const wallet = { money: 100 };
    signContract(s, wallet, 'calabria', 'bergamot', MARCH, ownedMaterials);
    const c = s.contracts[0];
    harvest(s, wallet, c.id, 'cold-pressing', c.ripeAt, owned);
    const readyAt = s.batches[0].readyAt;
    const arrives = readyAt + shippingGameHours(regions.find((r) => r.id === 'calabria')!);
    expect(tickSourcing(s, readyAt)).toEqual([]);
    expect(s.shipments).toHaveLength(1);
    expect(tickSourcing(s, arrives - 1)).toEqual([]);
    const crates = tickSourcing(s, arrives);
    expect(crates).toHaveLength(1);
    unpack(s, crates[0].id, arrives);
    expect(stockOf(s, 'bergamot')).toBe(cropOf('calabria', 'bergamot')!.grams);
  });

  it('ship faster from nearby regions than from far away', () => {
    const near = shippingGameHours(regions.find((r) => r.id === 'provence')!);
    const far = shippingGameHours(regions.find((r) => r.id === 'indonesia')!);
    expect(far).toBeGreaterThan(near);
  });
});

describe('inventory', () => {
  it('ages patchouli but not bergamot', () => {
    const lot = { id: 'l1', material: 'patchouli', grams: 10, quality: 1, since: 0 };
    expect(lotQuality(lot, 24 * 10)).toBeGreaterThan(1);
    expect(lotQuality({ ...lot, material: 'bergamot' }, 24 * 10)).toBe(1);
  });

  it('uses up materials for a perfume, oldest first, and refuses when short', () => {
    const s = newSourcingState();
    order(s, { money: 100 }, 'vanillin', false, 0, ownedMaterials);
    order(s, { money: 100 }, 'labdanum', true, 0, ownedMaterials);
    for (const crate of tickSourcing(s, 100)) unpack(s, crate.id, 100);
    expect(consume(s, { vanillin: 1, bergamot: 1 }, 100)).toBeNull();
    const q = consume(s, { vanillin: 1, labdanum: 1 }, 100);
    expect(q).not.toBeNull();
    expect(stockOf(s, 'vanillin')).toBeCloseTo(9.5);
  });
});
