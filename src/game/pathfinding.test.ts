import { describe, expect, it } from 'vitest';
import { findPath } from './pathfinding';
import { isWalkable, shop, validateShop, type Point } from './shop';

const crossesCounter = (path: Point[], from: Point) => {
  const counter = shop.fixtures.find((f) => f.id === 'counter')!;
  let prev = from;
  for (const p of path) {
    for (let t = 0; t <= 1; t += 0.02) {
      const x = prev[0] + (p[0] - prev[0]) * t;
      const z = prev[1] + (p[1] - prev[1]) * t;
      if (Math.abs(x - counter.position[0]) < counter.size[0] / 2 && Math.abs(z - counter.position[1]) < counter.size[2] / 2) return true;
    }
    prev = p;
  }
  return false;
};

describe('shop layout', () => {
  it('is valid', () => {
    expect(validateShop(shop)).toEqual([]);
  });
});

describe('findPath', () => {
  it('walks straight across open floor', () => {
    expect(findPath(shop, [1, 1.5], [-1, 1.5])).toEqual([[-1, 1.5]]);
  });

  it('walks around the counter to reach the organ', () => {
    const organ = shop.fixtures.find((f) => f.id === 'organ')!;
    const path = findPath(shop, shop.spawn, organ.interact!.standAt)!;
    expect(path).not.toBeNull();
    expect(path.at(-1)).toEqual(organ.interact!.standAt);
    expect(path.length).toBeGreaterThan(1);
    expect(crossesCounter(path, shop.spawn)).toBe(false);
    expect(path.every((p) => isWalkable(shop, p))).toBe(true);
  });

  it('refuses a target inside a fixture or outside the room', () => {
    expect(findPath(shop, shop.spawn, [-0.8, -3.4])).toBeNull();
    expect(findPath(shop, shop.spawn, [10, 0])).toBeNull();
  });
});
