import { Nav, type Point, type Rect, type Solid } from './nav';

// A night's room, laid out from a seed: walls, furniture, places to sit, things to take.

export interface Prop {
  model: string;
  x: number;
  z: number;
  y: number;
  /** Quarter turns about the vertical: 0 faces south (towards the camera), 1 east, 2 north, 3 west. */
  rot: number;
  /** Extra turn in radians, for things that needn't stand square. */
  spin?: number;
  lamp?: boolean;
}

export interface Seat {
  x: number;
  z: number;
  rot: number;
  height: number;
  rect: Rect;
}

export interface Loot {
  x: number;
  z: number;
  y: number;
  model: string;
}

export interface Level {
  night: number;
  seed: number;
  width: number;
  depth: number;
  doorX: number;
  spawn: Point;
  walls: { north: string[]; west: string[]; east: string[] };
  props: Prop[];
  solids: Solid[];
  seats: Seat[];
  loot: Loot[];
  quota: number;
  guards: number;
}

interface Piece {
  model: string;
  /** Footprint, facing south. */
  w: number;
  d: number;
  h: number;
  /** A top to put things on, at this height. */
  top?: number;
  /** A seat at this height. */
  seat?: number;
  solid?: boolean;
  lamp?: boolean;
}

const P = (model: string, w: number, d: number, h: number, extra: Partial<Piece> = {}): Piece => ({ model, w, d, h, solid: true, ...extra });

export const PIECES: Record<string, Piece> = {
  shelfA: P('shelf-tall-a', 1.68, 0.5, 2.65),
  shelfB: P('shelf-tall-b', 1.68, 0.5, 2.65),
  bookshelf: P('bookshelf', 0.96, 0.36, 2.04),
  rack: P('supplies-rack', 1.26, 0.42, 1.67),
  organ: P('perfume-organ', 1.56, 0.76, 1.74),
  vanity: P('vanity-table', 1.0, 0.47, 1.55),
  sideboard: P('sideboard', 1.58, 0.53, 1.32, { top: 1.0 }),
  chest: P('chest-armillary', 0.96, 0.51, 1.1),
  displayCase: P('display-case', 0.84, 0.56, 1.39, { top: 1.39 }),
  counter: P('shop-counter', 1.86, 0.68, 1.25, { top: 1.0 }),
  coffeeBar: P('coffee-bar', 2.0, 0.7, 1.32),
  displayTable: P('display-table', 1.22, 1.22, 1.4, { top: 1.4 }),
  bigPlant: P('plant-leafy', 0.7, 0.7, 1.4),
  mirror: P('standing-mirror', 0.5, 0.4, 1.49),
  roundTable: P('round-table', 0.84, 0.84, 0.73, { top: 0.73 }),
  cafeTable: P('cafe-table', 0.64, 0.64, 0.8, { top: 0.8 }),
  desk: P('writing-desk', 1.1, 0.56, 0.94, { top: 0.78 }),
  crate: P('wooden-crate', 0.5, 0.5, 0.5, { top: 0.5 }),
  sacks: P('coffee-sacks', 0.76, 0.5, 0.45),
  armchair: P('armchair', 0.8, 0.72, 0.92, { seat: 0.42 }),
  sofa: P('sofa', 1.6, 0.86, 0.9, { seat: 0.42 }),
  rocker: P('rocking-chair', 0.6, 0.56, 1.02, { seat: 0.44 }),
  bench: P('cushion-bench', 1.2, 0.36, 0.67, { seat: 0.46 }),
  cafeChair: P('cafe-chair', 0.36, 0.36, 0.71, { seat: 0.45 }),
  deskChair: P('desk-chair', 0.46, 0.46, 0.87, { seat: 0.46 }),
  stool: P('bar-stool', 0.4, 0.4, 0.79, { seat: 0.76 }),
  fern: P('fern', 0.5, 0.5, 0.65),
  pot: P('potted-plant', 0.5, 0.5, 0.62),
  snake: P('snake-plant', 0.28, 0.28, 0.74),
  lamp: P('floor-lamp', 0.4, 0.4, 1.56, { lamp: true }),
  rugRound: P('rug-round', 2.6, 2.6, 0, { solid: false }),
  rugSquare: P('shop-rug', 2.3, 2.3, 0, { solid: false }),
  rugRunner: P('rug-runner', 3.74, 1.3, 0, { solid: false }),
};

/** Furniture that stands with its back to a wall. */
const WALL_PIECES = ['shelfA', 'shelfB', 'bookshelf', 'bookshelf', 'rack', 'organ', 'vanity', 'sideboard', 'sideboard', 'chest', 'displayCase', 'bench', 'desk'];

type Member = [piece: string, dx: number, dz: number, rot: number];
/** Groups that stand in the open, laid out facing south. */
const GROUPS: { weight: number; members: Member[] }[] = [
  { weight: 3, members: [['cafeTable', 0, 0, 0], ['cafeChair', -0.6, 0, 1], ['cafeChair', 0.6, 0, 3]] },
  { weight: 3, members: [['rugRound', 0, 0.2, 0], ['sofa', 0, -0.55, 0], ['roundTable', 0, 0.6, 0]] },
  { weight: 2, members: [['rugSquare', 0, 0, 0], ['armchair', -0.62, 0, 1], ['roundTable', 0.35, 0, 0], ['lamp', -0.55, -0.7, 0]] },
  { weight: 3, members: [['counter', 0, 0, 0], ['stool', -0.5, 0.62, 2], ['stool', 0.5, 0.62, 2]] },
  { weight: 2, members: [['coffeeBar', 0, 0, 0], ['sacks', 1.45, 0.05, 0]] },
  { weight: 3, members: [['displayTable', 0, 0, 0]] },
  { weight: 2, members: [['desk', 0, 0, 0], ['deskChair', 0, 0.55, 2]] },
  { weight: 2, members: [['bigPlant', 0, 0, 0], ['rocker', 0.75, 0.1, 0]] },
  { weight: 2, members: [['crate', 0, 0, 0], ['crate', 0.52, 0.04, 0], ['crate', 0.25, 0.55, 0]] },
  { weight: 1, members: [['mirror', 0, 0, 0], ['pot', 0.6, 0, 0]] },
  { weight: 1, members: [['armchair', 0, 0, 0], ['lamp', 0.65, -0.1, 0]] },
  { weight: 1, members: [['displayCase', 0, 0, 0], ['fern', 0.75, 0, 0]] },
];

const BOTTLES = ['perfume-bottle-gumdrop', 'perfume-bottle-tall', 'perfume-bottle-moon', 'perfume-bottle-atomizer', 'perfume-bottle-bell'];

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How big a night is. */
export function nightPlan(night: number): { width: number; depth: number; loot: number; quota: number; guards: number } {
  const sizes: [number, number][] = [[10, 10], [12, 10], [12, 12], [14, 12], [14, 14], [16, 14]];
  const [width, depth] = sizes[Math.min(sizes.length - 1, night - 1)];
  const loot = Math.min(10, 3 + night);
  return { width, depth, loot, quota: Math.ceil(loot * 0.6), guards: Math.min(4, 1 + Math.floor(night / 2)) };
}

function turn(dx: number, dz: number, rot: number): Point {
  let p: Point = [dx, dz];
  for (let k = 0; k < (rot & 3); k++) p = [p[1], -p[0]];
  return p;
}

function gap(a: Rect, b: Rect): number {
  return Math.max(Math.abs(a.x - b.x) - a.hw - b.hw, Math.abs(a.z - b.z) - a.hd - b.hd);
}

/** Space left between groups, so there is always a way round. */
const AISLE = 1.2;

function attempt(night: number, seed: number): Level | null {
  const rng = mulberry32(seed);
  const pick = <T>(list: T[]): T => list[Math.floor(rng() * list.length)];
  const snap = (v: number) => Math.round(v * 4) / 4;
  const plan = nightPlan(night);
  const { width: W, depth: D } = plan;

  const doorX = -W / 2 + 1 + 2 * (1 + Math.floor(rng() * (W / 2 - 2)));
  const spawn: Point = [snap((rng() - 0.5) * W * 0.5), D / 2 - 0.9];
  const keepClear: Rect[] = [
    { x: doorX, z: -D / 2 + 1.3, hw: 1.2, hd: 1.3 },
    { x: spawn[0], z: spawn[1], hw: 1.3, hd: 1.3 },
  ];

  const props: Prop[] = [];
  const solids: (Solid & { wall: boolean })[] = [];
  const seats: Seat[] = [];
  const tops: { x: number; z: number; y: number }[] = [];
  let lamps = 0;

  const place = (members: Member[], x: number, z: number, rot: number, wall: boolean): boolean => {
    const made = members.map(([id, dx, dz, r]) => {
      const piece = PIECES[id];
      const [ox, oz] = turn(dx, dz, rot);
      const total = (r + rot) & 3;
      const side = total & 1;
      const rect: Rect = { x: x + ox, z: z + oz, hw: (side ? piece.d : piece.w) / 2, hd: (side ? piece.w : piece.d) / 2 };
      return { piece, rect, rot: total };
    });
    for (const m of made) {
      if (!m.piece.solid) continue;
      const inset = wall ? 0 : AISLE;
      if (Math.abs(m.rect.x) + m.rect.hw > W / 2 - inset || Math.abs(m.rect.z) + m.rect.hd > D / 2 - inset) return false;
      if (keepClear.some((k) => gap(m.rect, k) < 0)) return false;
      if (solids.some((s) => gap(m.rect, s) < (wall && s.wall ? 0.12 : AISLE))) return false;
    }
    for (const m of made) {
      if (m.piece.lamp && lamps >= 2) continue;
      if (m.piece.lamp) lamps++;
      props.push({ model: m.piece.model, x: m.rect.x, z: m.rect.z, y: 0, rot: m.rot, lamp: m.piece.lamp });
      if (!m.piece.solid) continue;
      solids.push({ ...m.rect, tall: m.piece.h >= 1.2, wall });
      if (m.piece.seat) seats.push({ x: m.rect.x, z: m.rect.z, rot: m.rot, height: m.piece.seat, rect: m.rect });
      if (m.piece.top) tops.push({ x: m.rect.x, z: m.rect.z, y: m.piece.top });
    }
    return true;
  };

  // Along the walls.
  const wallTarget = Math.round((W + 2 * D) / 3.2);
  for (let tries = 0, done = 0; tries < wallTarget * 8 && done < wallTarget; tries++) {
    const id = pick(WALL_PIECES);
    const piece = PIECES[id];
    const side = Math.floor(rng() * 3);
    const off = piece.d / 2 + 0.12;
    const ok =
      side === 0
        ? place([[id, 0, 0, 0]], snap((rng() - 0.5) * (W - piece.w - 0.6)), -D / 2 + off, 0, true)
        : place([[id, 0, 0, 0]], (side === 1 ? -1 : 1) * (W / 2 - off), snap((rng() - 0.5) * (D - piece.w - 2.4) - 0.6), side === 1 ? 1 : 3, true);
    if (ok) done++;
  }

  // In the open.
  const bag = GROUPS.flatMap((g) => Array<Member[]>(g.weight).fill(g.members));
  const openTarget = Math.round((W * D) / 13);
  for (let tries = 0, done = 0; tries < openTarget * 14 && done < openTarget; tries++) {
    const x = snap((rng() - 0.5) * (W - 4.4));
    const z = snap((rng() - 0.5) * (D - 4.4));
    if (place(pick(bag), x, z, Math.floor(rng() * 4), false)) done++;
  }
  // Make sure there is enough to take things from, and somewhere to sit.
  for (let tries = 0; tries < 200 && (tops.length < plan.loot || seats.length < 2); tries++) {
    const x = snap((rng() - 0.5) * (W - 4));
    const z = snap((rng() - 0.5) * (D - 4));
    place(tops.length < plan.loot ? [[pick(['roundTable', 'crate', 'cafeTable']), 0, 0, 0]] : [['armchair', 0, 0, 0]], x, z, Math.floor(rng() * 4), false);
  }
  if (tops.length < plan.loot || seats.length < 1) return null;

  // What to take: spread over the tops, the further from the way in the better.
  const order = tops.map((t) => ({ t, key: rng() + Math.hypot(t.x - spawn[0], t.z - spawn[1]) / (W + D) })).sort((a, b) => b.key - a.key);
  const chosen: typeof tops = [];
  for (const spread of [1.6, 0.4]) {
    for (const { t } of order) {
      if (chosen.length < plan.loot && !chosen.includes(t) && chosen.every((c) => Math.hypot(c.x - t.x, c.z - t.z) >= spread)) chosen.push(t);
    }
  }
  const loot: Loot[] = chosen.map((t) => ({ x: t.x, z: t.z, y: t.y, model: pick(BOTTLES) }));

  // Small things round the edges.
  props.push({ model: 'rug-runner', x: doorX, z: -D / 2 + 1.95, y: 0, rot: 1 });
  for (let k = 0; k < 4; k++) {
    const id = pick(['fern', 'pot', 'snake', 'snake']);
    const sx = k < 2 ? -1 : 1;
    const x = sx * (W / 2 - 0.45);
    const z = k % 2 ? D / 2 - 0.5 : -D / 2 + 0.5;
    place([[id, 0, 0, 0]], x, z, 0, true);
  }

  const wallRun = (n: number, door = -1) => Array.from({ length: n }, (_, i) => (i === door ? 'doorway' : rng() < 0.3 ? 'window' : 'plain'));
  const walls = { north: wallRun(W / 2, (doorX + W / 2 - 1) / 2), west: wallRun(D / 2), east: wallRun(D / 2) };

  // Everything has to be reachable on foot.
  const nav = new Nav(W, D, solids);
  const reach = nav.reach(spawn);
  const near = (x: number, z: number, r: number) => reach.some((c) => Math.hypot(c[0] - x, c[1] - z) <= r);
  if (!near(doorX, -D / 2 + 0.6, 0.4)) return null;
  if (loot.some((l) => !near(l.x, l.z, 1.15))) return null;
  if (reach.length < nav.cols * nav.rows * 0.35) return null;

  return { night, seed, width: W, depth: D, doorX, spawn, walls, props, solids, seats, loot, quota: plan.quota, guards: plan.guards };
}

export function makeLevel(night: number, seed: number): Level {
  for (let k = 0; k < 200; k++) {
    const level = attempt(night, seed + k * 7919);
    if (level) return level;
  }
  throw new Error(`No room could be laid out for night ${night}`);
}
