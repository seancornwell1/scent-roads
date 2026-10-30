import { isWalkable, type Point, type RoomLayout } from './shop';

/**
 * Shortest walkable path from `from` to `to` on a grid over the floor (A*, 8 directions,
 * no corner cutting), simplified to the corners where it turns. Returns null if `to`
 * can't be reached. The result starts after `from` and ends exactly at `to`.
 */
export function findPath(layout: RoomLayout, from: Point, to: Point): Point[] | null {
  if (!isWalkable(layout, to)) return null;
  const step = layout.gridStep;
  const cols = Math.floor(layout.room.width / step) + 1;
  const rows = Math.floor(layout.room.depth / step) + 1;
  const toCell = ([x, z]: Point) => [
    Math.round((x + layout.room.width / 2) / step),
    Math.round((z + layout.room.depth / 2) / step),
  ];
  const toPoint = (c: number, r: number): Point => [c * step - layout.room.width / 2, r * step - layout.room.depth / 2];
  const key = (c: number, r: number) => r * cols + c;

  const walkable = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) walkable[key(c, r)] = isWalkable(layout, toPoint(c, r)) ? 1 : 0;

  const [sc, sr] = toCell(from);
  const [gc, gr] = toCell(to);
  const start = key(sc, sr);
  const goal = key(gc, gr);
  walkable[start] = 1; // the player may stand slightly off-grid
  walkable[goal] = 1;

  const g = new Float64Array(cols * rows).fill(Infinity);
  const came = new Int32Array(cols * rows).fill(-1);
  const closed = new Uint8Array(cols * rows);
  const h = (c: number, r: number) => Math.hypot(c - gc, r - gr);
  const open: { k: number; f: number }[] = [{ k: start, f: h(sc, sr) }];
  g[start] = 0;

  while (open.length > 0) {
    let best = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
    const { k } = open.splice(best, 1)[0];
    if (k === goal) break;
    if (closed[k]) continue;
    closed[k] = 1;
    const c = k % cols;
    const r = (k - c) / cols;
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (dc === 0 && dr === 0) continue;
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const nk = key(nc, nr);
        if (!walkable[nk] || closed[nk]) continue;
        if (dc !== 0 && dr !== 0 && (!walkable[key(c + dc, r)] || !walkable[key(c, r + dr)])) continue;
        const cost = g[k] + (dc !== 0 && dr !== 0 ? Math.SQRT2 : 1);
        if (cost < g[nk]) {
          g[nk] = cost;
          came[nk] = k;
          open.push({ k: nk, f: cost + h(nc, nr) });
        }
      }
    }
  }
  if (start !== goal && came[goal] === -1) return null;

  const cells: number[] = [];
  for (let k = goal; k !== start && k !== -1; k = came[k]) cells.unshift(k);
  const points = cells.map((k) => toPoint(k % cols, Math.floor(k / cols)));
  if (points.length > 0) points[points.length - 1] = to;
  else points.push(to);
  return simplify(layout, from, points);
}

/** Drops waypoints that can be skipped with a straight, clear line. */
function simplify(layout: RoomLayout, from: Point, points: Point[]): Point[] {
  const result: Point[] = [];
  let current = from;
  let i = 0;
  while (i < points.length) {
    let far = i;
    for (let j = points.length - 1; j > i; j--) {
      if (clearLine(layout, current, points[j])) {
        far = j;
        break;
      }
    }
    result.push(points[far]);
    current = points[far];
    i = far + 1;
  }
  return result;
}

function clearLine(layout: RoomLayout, a: Point, b: Point): boolean {
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (layout.gridStep / 2));
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    if (!isWalkable(layout, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])) return false;
  }
  return true;
}
