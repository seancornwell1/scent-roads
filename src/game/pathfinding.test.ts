import { describe, expect, it } from 'vitest';
import { findPath } from './pathfinding';
import { backRoom, isWalkable, shop, standOn, validateBackRoom, validateShop, type Point, type Zone } from './shop';

const crossesCounter = (path: Point[], from: Point) => {
  const counter = shop.fixtures.find((f) => f.id === 'counter-left')!;
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

describe('room layouts', () => {
  it('the shop is valid', () => {
    expect(validateShop(shop)).toEqual([]);
  });

  it('the back room is valid, and every door and fixture in it can be reached from the shop door', () => {
    expect(validateBackRoom(backRoom)).toEqual([]);
    for (const f of backRoom.fixtures) if (f.interact) expect(findPath(backRoom, backRoom.spawn, f.interact.standAt)).not.toBeNull();
  });
});

describe('standOn', () => {
  const spot = (extra: Partial<Zone>): Zone => ({ id: 's', label: 'Spot', kind: 'upgrade', rect: [2, -5, 1.4, 1], ...extra });

  it('stands a piece in the middle of its spot, facing the way the spot says', () => {
    expect(standOn(spot({ facing: 0 }), [1, 0.4])).toEqual({ position: [2, -5], rotation: 0, size: [1, 0.4] });
    expect(standOn(spot({ facing: 90 }), [1, 0.4])).toEqual({ position: [2, -5], rotation: 90, size: [0.4, 1] });
  });

  it('pushes a piece on a flush spot back to the edge behind it', () => {
    // Facing the front: the back edge is at z = -5.5, so a 0.4 m deep piece is centred 0.2 m in front of it.
    expect(standOn(spot({ facing: 0, flush: true }), [1, 0.4]).position).toEqual([2, -5.3]);
    // Facing right: the back edge is at x = 1.3.
    expect(standOn(spot({ facing: 90, flush: true }), [1, 0.4]).position).toEqual([1.5, -5]);
    // A piece deeper than the spot keeps its back on the edge and sticks out in front.
    expect(standOn(spot({ facing: 0, flush: true }), [1, 1.2]).position).toEqual([2, -4.9]);
  });

  it('a piece turned towards the camera covers its widest reach both ways', () => {
    const { size } = standOn(spot({ facing: 45 }), [1.6, 0.86]);
    expect(size[0]).toBeCloseTo((1.6 + 0.86) / Math.SQRT2, 2);
    expect(size[1]).toBeCloseTo(size[0], 5);
  });

  it('every upgrade spot in the shop leaves the customers a way in when it holds the largest piece', () => {
    const largest: [number, number] = [1.6, 0.86];
    const full = { ...shop, obstacles: shop.zones.filter((z) => z.kind === 'upgrade').map((z) => standOn(z, largest)) };
    for (const p of shop.customers.queue) expect(findPath(full, shop.customers.entrance, p)).not.toBeNull();
    for (const f of shop.fixtures) if (f.interact) expect(findPath(full, shop.spawn, f.interact.standAt)).not.toBeNull();
  });
});

describe('findPath', () => {
  it('walks straight across open floor', () => {
    expect(findPath(shop, [-1, 4], [2, 5])).toEqual([[2, 5]]);
  });

  it('walks around the counter to reach the organ', () => {
    const organ = shop.fixtures.find((f) => f.id === 'organ')!;
    const from: [number, number] = [-1, 0];
    const path = findPath(shop, from, organ.interact!.standAt)!;
    expect(path).not.toBeNull();
    expect(path.at(-1)).toEqual(organ.interact!.standAt);
    expect(path.length).toBeGreaterThan(1);
    expect(crossesCounter(path, from)).toBe(false);
    expect(path.every((p) => isWalkable(shop, p))).toBe(true);
  });

  it('refuses a target inside a fixture or outside the room', () => {
    expect(findPath(shop, shop.spawn, [-1.78, -6.6])).toBeNull();
    expect(findPath(shop, shop.spawn, [10, 0])).toBeNull();
  });
});
