import shopJson from '../data/shop.json';
import backRoomJson from '../data/backroom.json';
import type { CharacterConfig } from './character';

// The rooms: the shop (src/data/shop.json) and the back room (src/data/backroom.json).
// Floor coordinates are [x, z] in metres, centred on each room; x runs to the right-hand
// wall, z towards the front.

export type Point = [number, number];

/**
 * A lamp's light: it glows from `y` metres above the floor at the model's spot (plus `offset`, in the room's x and z).
 * On bought furniture (`furniture.json`), `y` is measured from where the piece stands.
 */
export interface Glow {
  y: number;
  color: string;
  intensity: number;
  /** How far the light reaches, in metres. */
  distance: number;
  offset?: Point;
}

/** How a room is lit. Colours are CSS hex strings; the scene only reads these numbers. */
export interface Lighting {
  /** Overall brightness of the picture (1 = as is). */
  exposure: number;
  /** Strength of the soft reflected light on shiny materials. */
  environment: number;
  /** Light from everywhere: `sky` from above, `ground` from below. */
  ambient: { sky: string; ground: string; intensity: number };
  /**
   * The sun. `from` is where it stands, [x, y, z] in metres from the middle of the floor.
   * `shadow`: `mapSize` in pixels (a power of two), `softness` of the edges, or null for no shadows.
   */
  sun: { color: string; intensity: number; from: [number, number, number]; shadow: { mapSize: number; softness: number } | null };
}

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
  /** Height it stands at, e.g. a placeholder box on a desk (0 = the floor). */
  y?: number;
  blocks: boolean;
  interact: { action: string; standAt: Point } | null;
  /** A lamp: the light it gives. */
  glow?: Glow;
}

/** A model that is only for looks: no walking or tapping. */
export interface Decor {
  /** Only needed by decor the coffee corner moves or takes away (`cafe` in shop.json). */
  id?: string;
  model: string;
  position: Point;
  /** Height above the floor, e.g. to stand on a table. */
  y: number;
  rotation: number;
  /** A lamp or sconce: the light it gives. */
  glow?: Glow;
}

/** A rectangle of floor: centre x, centre z, width, depth. */
export type Rect = [number, number, number, number];

/** A floor area: where customers gather (invisible), or an empty spot for a future upgrade. */
export interface Zone {
  id: string;
  label: string;
  kind: 'customers' | 'upgrade';
  /** Centre x, centre z, width, depth. */
  rect: Rect;
  /**
   * Upgrade spots: the way a piece placed here faces, in degrees like a fixture's `rotation`
   * (0 = towards the front of the room, 90 = towards its right-hand side, 45 = towards the camera).
   * Customers' areas: the way people turn once they stand there (left out: as they came).
   */
  facing?: number;
  /**
   * Upgrade spots: the piece's back stands on the spot's back edge (against a wall, or in line
   * with its neighbours) rather than in the middle. Needs a `facing` square to the room.
   */
  flush?: boolean;
}

/**
 * Where a piece of furniture with footprint [width, depth] stands on an upgrade spot: its
 * centre, its turn in degrees, and the floor it covers as [x extent, z extent].
 */
export function standOn(zone: Zone, [w, d]: [number, number]): { position: Point; rotation: number; size: [number, number] } {
  const rotation = zone.facing ?? 0;
  const a = (rotation * Math.PI) / 180;
  const sin = Math.sin(a);
  const cos = Math.cos(a);
  const [x, z, zoneW, zoneD] = zone.rect;
  const round = (n: number) => Math.round(n * 1000) / 1000;
  // How far back from the middle the piece goes, so its back is on the spot's back edge.
  const back = zone.flush ? (Math.abs(zoneW * sin) + Math.abs(zoneD * cos) - d) / 2 : 0;
  return {
    position: [round(x - sin * back), round(z - cos * back)],
    rotation,
    size: [round(Math.abs(w * cos) + Math.abs(d * sin)), round(Math.abs(w * sin) + Math.abs(d * cos))],
  };
}

/** What every room has: its size, walls, floor, fixtures and decor. */
export interface RoomLayout {
  room: { width: number; depth: number; wallHeight: number };
  lighting: Lighting;
  /** Colour of the plane under the floor tiles. */
  floorColor: string;
  /** A square floor tile model repeated across the room; its top sits at y = 0. */
  floorTile?: { model: string; size: number; height: number };
  /** Where the view starts, as [x, z]. Zoom 1 shows the whole room across the screen's width. */
  camera: { focus: Point; defaultZoom: number; minZoom: number; maxZoom: number };
  spawn: Point;
  walkSpeed: number;
  playerRadius: number;
  gridStep: number;
  /** 2 m wall panels: `back` runs left to right along the back wall, `left` back to front along the left wall. */
  walls: { panels: Record<string, string>; back: string[]; left: string[] };
  fixtures: Fixture[];
  /** Placed furniture to walk around, set at run time (not in the data). */
  obstacles?: { position: Point; size: [number, number] }[];
  /** Floor nobody walks on, e.g. behind a bar: rectangles as centre x, centre z, width, depth. */
  blocked?: Rect[];
  decor: Decor[];
  zones: Zone[];
}

/** Someone who works in the shop: they stand at `position`, turned `facing` degrees, and tapping them is tapping their `fixture`. */
export interface Person {
  id: string;
  name: string;
  look: CharacterConfig;
  position: Point;
  facing: number;
  fixture: string;
}

/**
 * A seat a customer may take: they walk to `from` (open floor beside it), step onto `position`,
 * turn `facing` degrees and sit, `height` metres above the floor.
 */
export interface Seat {
  id: string;
  position: Point;
  facing: number;
  height: number;
  from: Point;
}

/**
 * The coffee corner, which arrives once you reach `unlock.rank`. It changes the shop it finds:
 * `removes` lists ids of fixtures, decor and zones that go; `fixtures`, `decor` and `zones` are
 * added, or stand in for the ones with the same id (which keeps upgrade spots' ids, and so what
 * is placed on them).
 */
export interface Cafe {
  unlock: { rank: string };
  /** Said once, when it arrives. */
  arrival: string;
  /** What the vendor says when you stop at the bar, one at a time. */
  lines: string[];
  removes: string[];
  fixtures: Fixture[];
  decor: Decor[];
  zones: Zone[];
  people: Person[];
  seats: Seat[];
  /** The chance that a customer coming in sits down first, and for how long (seconds, [min, max]). */
  seatChance: number;
  seatSeconds: [number, number];
  blocked: Rect[];
}

/** The shop floor: customers, and surfaces for small decor. */
export interface ShopLayout extends RoomLayout {
  /** The coffee corner that arrives later (see `Cafe`), and whether this layout has it in. */
  cafe: Cafe;
  cafeOpen?: boolean;
  /** Who works here and where customers can sit: empty until the coffee corner arrives. */
  people?: Person[];
  seats?: Seat[];
  seatChance?: number;
  seatSeconds?: [number, number];
  /** Where customers come in, and the spots where they queue at the counter (front of the queue first). */
  customers: { entrance: Point; queue: Point[]; walkSpeed: number };
  /** Table and counter tops where small decor can be placed. */
  surfaces: { id: string; label: string; position: Point; y: number; facing: number }[];
  /** How an empty upgrade spot is marked on the floor: a tint this see-through (0 to 1). */
  upgradeSpot: { color: string; opacity: number };
}

/** The back room: crates by the outside door, and the supplies rack. */
export interface BackRoomLayout extends RoomLayout {
  /** Where arrived crates stand, by the door to the outside. */
  crates: { model: string; spots: Point[]; stackHeights: number[] };
  /**
   * The rack that shows what's on hand: one bottle per material, on the shelves of the
   * fixture `fixture`, at heights `levels` (above the floor, filled in order), `perLevel` to a
   * shelf, `spacing` apart, and `forward` of the rack's centre (towards the room).
   */
  rack: { fixture: string; bottle: string; levels: number[]; perLevel: number; spacing: number; forward: number };
}

export const WALL_PANEL_WIDTH = 2;

/** The shop as shop.json has it: before the coffee corner arrives. */
export const shopData = shopJson as unknown as ShopLayout;
/** The shop as it stands now: `shopData`, with the coffee corner in once `setCafe(true)` is called. */
export const shop: ShopLayout = { ...shopData };
export const backRoom = backRoomJson as unknown as BackRoomLayout;

/** A shop with its coffee corner in. */
export function withCafe(layout: ShopLayout): ShopLayout {
  const { cafe } = layout;
  const gone = new Set(cafe.removes);
  const merge = <T extends { id?: string }>(base: T[], extra: T[]): T[] => {
    const standIns = new Map(extra.filter((e) => e.id).map((e) => [e.id, e]));
    const had = new Set(base.map((b) => b.id));
    return [
      ...base.filter((b) => !b.id || !gone.has(b.id)).map((b) => (b.id && standIns.get(b.id)) || b),
      ...extra.filter((e) => !e.id || !had.has(e.id)),
    ];
  };
  return {
    ...layout,
    fixtures: merge(layout.fixtures, cafe.fixtures),
    decor: merge(layout.decor, cafe.decor),
    zones: merge(layout.zones, cafe.zones),
    blocked: [...(layout.blocked ?? []), ...cafe.blocked],
    people: cafe.people,
    seats: cafe.seats,
    seatChance: cafe.seatChance,
    seatSeconds: cafe.seatSeconds,
    cafeOpen: true,
  };
}

/**
 * Brings the coffee corner into `shop`, or takes it out again. `shop` is changed in place, so
 * everything holding it follows. Returns true if the shop changed.
 */
export function setCafe(open: boolean): boolean {
  if (!!shop.cafeOpen === open) return false;
  const closed = { ...shopData, blocked: shopData.blocked, people: undefined, seats: undefined, seatChance: undefined, seatSeconds: undefined, cafeOpen: false };
  Object.assign(shop, open ? withCafe(shopData) : closed, { obstacles: shop.obstacles });
  return true;
}

export type RoomId = 'shop' | 'back';

/** True if a point on the floor is clear for the player: inside the room and off blocking fixtures. */
export function isWalkable(layout: RoomLayout, [x, z]: Point): boolean {
  const r = layout.playerRadius;
  const halfW = layout.room.width / 2 - r;
  const halfD = layout.room.depth / 2 - r;
  if (x < -halfW || x > halfW || z < -halfD || z > halfD) return false;
  for (const o of layout.obstacles ?? []) {
    if (Math.abs(x - o.position[0]) < o.size[0] / 2 + r && Math.abs(z - o.position[1]) < o.size[1] / 2 + r) return false;
  }
  for (const [bx, bz, w, d] of layout.blocked ?? []) {
    if (Math.abs(x - bx) < w / 2 + r && Math.abs(z - bz) < d / 2 + r) return false;
  }
  return layout.fixtures.every((f) => {
    if (!f.blocks) return true;
    const [fx, fz] = f.position;
    return Math.abs(x - fx) >= f.size[0] / 2 + r || Math.abs(z - fz) >= f.size[2] / 2 + r;
  });
}

/** Checks a room: fixtures, decor and zones inside it, walls covering it, spots you can stand on. */
export function validateRoom(layout: RoomLayout): string[] {
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
    if (zone.kind === 'upgrade') {
      if (typeof zone.facing !== 'number') errors.push(`zone "${zone.id}": an upgrade spot needs a facing`);
      else if (zone.flush && zone.facing % 90 !== 0) errors.push(`zone "${zone.id}": a flush spot must face square to the room`);
    }
  }
  const { walls, room } = layout;
  if (walls.back.length * WALL_PANEL_WIDTH !== room.width) errors.push('walls.back must cover the room width in 2 m panels');
  if (walls.left.length * WALL_PANEL_WIDTH !== room.depth) errors.push('walls.left must cover the room depth in 2 m panels');
  for (const kind of [...walls.back, ...walls.left]) if (!walls.panels[kind]) errors.push(`walls: unknown panel "${kind}"`);
  if (!isWalkable(layout, layout.spawn)) errors.push('spawn is not walkable');
  return errors;
}

export function validateShop(layout: ShopLayout): string[] {
  const errors = validateRoom(layout);
  if (!isWalkable(layout, layout.customers.entrance)) errors.push('customers.entrance is not walkable');
  layout.customers.queue.forEach((p, i) => {
    if (!isWalkable(layout, p)) errors.push(`customers.queue[${i}] is not walkable`);
  });
  if (!layout.zones.some((z) => z.kind === 'customers')) errors.push('zones: customers need at least one area to browse');
  for (const person of layout.people ?? []) {
    if (!layout.fixtures.some((f) => f.id === person.fixture && f.interact)) errors.push(`person "${person.id}": no fixture "${person.fixture}" to tap`);
  }
  for (const seat of layout.seats ?? []) {
    if (!isWalkable(layout, seat.from)) errors.push(`seat "${seat.id}": its "from" is not walkable`);
    else if (Math.hypot(seat.from[0] - seat.position[0], seat.from[1] - seat.position[1]) > 1) errors.push(`seat "${seat.id}": "from" is more than a step away`);
  }
  return errors;
}

/**
 * Checks the coffee corner against the shop it arrives in (`layout` without it): what it takes
 * away exists, upgrade spots keep their ids, its rank is one of `rankIds`, and the shop with it
 * in is still a valid shop.
 */
export function validateCafe(layout: ShopLayout, rankIds: string[]): string[] {
  const { cafe } = layout;
  const errors: string[] = [];
  if (!rankIds.includes(cafe.unlock.rank)) errors.push(`cafe: unknown rank "${cafe.unlock.rank}"`);
  const ids = new Set([...layout.fixtures.map((f) => f.id), ...layout.decor.map((d) => d.id), ...layout.zones.map((z) => z.id)]);
  for (const id of cafe.removes) if (!ids.has(id)) errors.push(`cafe: removes "${id}", which the shop does not have`);
  if (cafe.lines.length === 0) errors.push('cafe: the vendor needs something to say');
  const open = withCafe(layout);
  const spots = (l: ShopLayout) => l.zones.filter((z) => z.kind === 'upgrade').map((z) => z.id).sort().join();
  if (spots(open) !== spots(layout)) errors.push('cafe: upgrade spots must keep their ids');
  return [...errors, ...validateShop(open).map((e) => `cafe: ${e}`)];
}

export function validateBackRoom(layout: BackRoomLayout): string[] {
  const errors = validateRoom(layout);
  if (!layout.fixtures.some((f) => f.id === layout.rack.fixture)) errors.push(`rack: no fixture "${layout.rack.fixture}"`);
  if (layout.crates.spots.length !== layout.crates.stackHeights.length) errors.push('crates: one stack height per spot');
  for (const p of layout.crates.spots) if (!isWalkable(layout, p)) errors.push(`crates: spot ${p} is blocked`);
  return errors;
}
