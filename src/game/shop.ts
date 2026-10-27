import shopJson from '../data/shop.json';

// The shop interior, from src/data/shop.json. Floor coordinates are [x, z] in metres,
// centred on the room; x runs to the right-hand wall, z towards the front door.

export type Point = [number, number];

export interface Fixture {
  id: string;
  label: string;
  position: Point;
  /** Width (x), height (y), depth (z). */
  size: [number, number, number];
  blocks: boolean;
  interact: { action: string; standAt: Point } | null;
  /** Path to a model in assets/, or null for a labelled placeholder box. */
  model: string | null;
}

export interface ShopLayout {
  room: { width: number; depth: number; wallHeight: number };
  spawn: Point;
  walkSpeed: number;
  playerRadius: number;
  gridStep: number;
  fixtures: Fixture[];
}

export const shop = shopJson as unknown as ShopLayout;

/** True if a point on the floor is clear for the player: inside the room and off blocking fixtures. */
export function isWalkable(layout: ShopLayout, [x, z]: Point): boolean {
  const r = layout.playerRadius;
  const halfW = layout.room.width / 2 - r;
  const halfD = layout.room.depth / 2 - r;
  if (x < -halfW || x > halfW || z < -halfD || z > halfD) return false;
  return layout.fixtures.every((f) => {
    if (!f.blocks) return true;
    const [fx, fz] = f.position;
    return Math.abs(x - fx) >= f.size[0] / 2 + r || Math.abs(z - fz) >= f.size[2] / 2 + r;
  });
}

export function validateShop(layout: ShopLayout): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const halfW = layout.room.width / 2;
  const halfD = layout.room.depth / 2;
  for (const f of layout.fixtures) {
    if (ids.has(f.id)) errors.push(`fixture "${f.id}": duplicate id`);
    ids.add(f.id);
    const [x, z] = f.position;
    if (Math.abs(x) + f.size[0] / 2 > halfW + 0.01 || Math.abs(z) + f.size[2] / 2 > halfD + 0.01) {
      errors.push(`fixture "${f.id}": outside the room`);
    }
    if (f.interact && !isWalkable(layout, f.interact.standAt)) errors.push(`fixture "${f.id}": standAt is not walkable`);
  }
  if (!isWalkable(layout, layout.spawn)) errors.push('spawn is not walkable');
  return errors;
}
