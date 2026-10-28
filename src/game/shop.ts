import shopJson from '../data/shop.json';

// The shop interior, from src/data/shop.json. Floor coordinates are [x, z] in metres,
// centred on the room; x runs to the right-hand wall, z towards the front.

export type Point = [number, number];

export interface Fixture {
  id: string;
  /** Text shown over it in the scene, or null for none. */
  label: string | null;
  /** Path to a model under assets/, or null for a labelled placeholder box. */
  model: string | null;
  position: Point;
  /** Degrees around the vertical axis. */
  rotation: number;
  /** World-space footprint: width (x), height (y), depth (z). Used for walking and tapping. */
  size: [number, number, number];
  blocks: boolean;
  interact: { action: string; standAt: Point } | null;
}

/** A model that is only for looks: no walking or tapping. */
export interface Decor {
  model: string;
  position: Point;
  /** Height above the floor, e.g. to stand on a table. */
  y: number;
  rotation: number;
}

/** A floor area: where customers gather (invisible), or an empty spot for a future upgrade. */
export interface Zone {
  id: string;
  label: string;
  kind: 'customers' | 'upgrade';
  /** Centre x, centre z, width, depth. */
  rect: [number, number, number, number];
}

export interface ShopLayout {
  room: { width: number; depth: number; wallHeight: number };
  /** Placeholder floor colour until a floor asset exists. */
  floorColor: string;
  /** Where the view starts, as [x, z]. Zoom 1 shows the whole room across the screen's width. */
  camera: { focus: Point; defaultZoom: number; minZoom: number; maxZoom: number };
  spawn: Point;
  walkSpeed: number;
  playerRadius: number;
  gridStep: number;
  /** Where customers come in, and the spots where they queue at the counter (front of the queue first). */
  customers: { entrance: Point; queue: Point[]; walkSpeed: number };
  /** Table and counter tops where small decor can be placed. */
  surfaces: { id: string; label: string; position: Point; y: number }[];
  /** Where arrived crates stand in the shop, by the back-room door. */
  crates: { model: string; spots: Point[]; stackHeights: number[] };
  /** 2 m wall panels: `back` runs left to right along the back wall, `left` back to front along the left wall. */
  walls: { panels: Record<string, string>; back: string[]; left: string[] };
  fixtures: Fixture[];
  /** Placed furniture to walk around, set at run time (not in the data). */
  obstacles?: { position: Point; size: [number, number] }[];
  decor: Decor[];
  zones: Zone[];
}

export const WALL_PANEL_WIDTH = 2;

export const shop = shopJson as unknown as ShopLayout;

/** True if a point on the floor is clear for the player: inside the room and off blocking fixtures. */
export function isWalkable(layout: ShopLayout, [x, z]: Point): boolean {
  const r = layout.playerRadius;
  const halfW = layout.room.width / 2 - r;
  const halfD = layout.room.depth / 2 - r;
  if (x < -halfW || x > halfW || z < -halfD || z > halfD) return false;
  for (const o of layout.obstacles ?? []) {
    if (Math.abs(x - o.position[0]) < o.size[0] / 2 + r && Math.abs(z - o.position[1]) < o.size[1] / 2 + r) return false;
  }
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
  const inside = ([x, z]: Point, w = 0, d = 0, slack = 0.2) =>
    Math.abs(x) + w / 2 <= halfW + slack && Math.abs(z) + d / 2 <= halfD + slack;

  for (const f of layout.fixtures) {
    if (ids.has(f.id)) errors.push(`fixture "${f.id}": duplicate id`);
    ids.add(f.id);
    if (!inside(f.position, f.size[0], f.size[2])) errors.push(`fixture "${f.id}": outside the room`);
    if (f.interact && !isWalkable(layout, f.interact.standAt)) errors.push(`fixture "${f.id}": standAt is not walkable`);
  }
  layout.decor.forEach((d, i) => {
    if (!inside(d.position)) errors.push(`decor #${i}: outside the room`);
  });
  for (const zone of layout.zones) {
    if (ids.has(zone.id)) errors.push(`zone "${zone.id}": duplicate id`);
    ids.add(zone.id);
    const [x, z, w, d] = zone.rect;
    if (!inside([x, z], w, d, 0.01)) errors.push(`zone "${zone.id}": outside the room`);
    if (zone.kind !== 'customers' && zone.kind !== 'upgrade') errors.push(`zone "${zone.id}": unknown kind "${zone.kind}"`);
    if (!isWalkable(layout, [x, z])) errors.push(`zone "${zone.id}": centre is blocked by a fixture`);
  }
  const { walls, room } = layout;
  if (walls.back.length * WALL_PANEL_WIDTH !== room.width) errors.push('walls.back must cover the room width in 2 m panels');
  if (walls.left.length * WALL_PANEL_WIDTH !== room.depth) errors.push('walls.left must cover the room depth in 2 m panels');
  for (const kind of [...walls.back, ...walls.left]) if (!walls.panels[kind]) errors.push(`walls: unknown panel "${kind}"`);
  if (!isWalkable(layout, layout.spawn)) errors.push('spawn is not walkable');
  if (!isWalkable(layout, layout.customers.entrance)) errors.push('customers.entrance is not walkable');
  layout.customers.queue.forEach((p, i) => {
    if (!isWalkable(layout, p)) errors.push(`customers.queue[${i}] is not walkable`);
  });
  if (!layout.zones.some((z) => z.kind === 'customers')) errors.push('zones: customers need at least one area to browse');
  return errors;
}
