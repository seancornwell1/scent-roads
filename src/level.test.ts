import { describe, expect, it } from 'vitest';
import { makeLevel, nightPlan } from './level';
import { Nav, clearLine, rayRect } from './nav';

describe('rooms', () => {
  it('lays out a playable room for every night and many seeds', () => {
    for (let night = 1; night <= 9; night++) {
      for (let seed = 1; seed <= 25; seed++) {
        const level = makeLevel(night, seed * 101 + night);
        const plan = nightPlan(night);
        expect(level.loot.length).toBe(plan.loot);
        expect(level.seats.length).toBeGreaterThan(0);
        const nav = new Nav(level.width, level.depth, level.solids);
        expect(nav.path(level.spawn, [level.doorX, -level.depth / 2 + 0.6])).not.toBeNull();
        // No two bottles on the same spot.
        const spots = new Set(level.loot.map((l) => `${l.x},${l.z}`));
        expect(spots.size).toBe(level.loot.length);
      }
    }
  });
  it('is the same room for the same seed', () => {
    expect(makeLevel(3, 42)).toEqual(makeLevel(3, 42));
  });
});

describe('sight lines', () => {
  const box = { x: 0, z: 0, hw: 1, hd: 1 };
  it('hits a box in the way and misses one that is not', () => {
    expect(rayRect(-3, 0, 1, 0, box)).toBeCloseTo(2);
    expect(rayRect(-3, 2, 1, 0, box)).toBe(Infinity);
    expect(clearLine([-3, 0], [3, 0], [box])).toBe(false);
    expect(clearLine([-3, 0], [-2, 0], [box])).toBe(true);
  });
});
