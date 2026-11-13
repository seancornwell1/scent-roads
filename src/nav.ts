// Walkable space: axis-aligned boxes in a rectangular room, a grid over them for
// path-finding, and the ray tests that sight lines use.

export type Point = [number, number];

export interface Rect {
  x: number;
  z: number;
  hw: number;
  hd: number;
}

export interface Solid extends Rect {
  /** Tall enough to hide behind. */
  tall: boolean;
}

/** How far along the ray from (ox, oz) in direction (dx, dz) it first hits the box; Infinity if never. */
export function rayRect(ox: number, oz: number, dx: number, dz: number, r: Rect): number {
  let t0 = 0;
  let t1 = Infinity;
  for (const [o, d, c, h] of [
    [ox, dx, r.x, r.hw],
    [oz, dz, r.z, r.hd],
  ] as const) {
    if (Math.abs(d) < 1e-9) {
      if (o < c - h || o > c + h) return Infinity;
      continue;
    }
    let a = (c - h - o) / d;
    let b = (c + h - o) / d;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return Infinity;
  }
  return t0;
}

/** Whether the straight line between two points misses every box. */
export function clearLine(a: Point, b: Point, rects: Rect[]): boolean {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  for (const r of rects) if (rayRect(a[0], a[1], dx, dz, r) <= 1) return false;
  return true;
}

export function distToRect(x: number, z: number, r: Rect): number {
  const dx = Math.max(Math.abs(x - r.x) - r.hw, 0);
  const dz = Math.max(Math.abs(z - r.z) - r.hd, 0);
  return Math.hypot(dx, dz);
}

export class Nav {
  readonly cols: number;
  readonly rows: number;
  private readonly blocked: Uint8Array;

  constructor(
    readonly width: number,
    readonly depth: number,
    solids: Rect[],
    readonly step = 0.25,
    readonly radius = 0.3,
  ) {
    this.cols = Math.round(width / step);
    this.rows = Math.round(depth / step);
    this.blocked = new Uint8Array(this.cols * this.rows);
    for (let j = 0; j < this.rows; j++) {
      for (let i = 0; i < this.cols; i++) {
        const [x, z] = this.centre(i, j);
        const edge = Math.min(x + width / 2, width / 2 - x, z + depth / 2, depth / 2 - z);
        if (edge < radius || solids.some((s) => distToRect(x, z, s) < radius)) this.blocked[j * this.cols + i] = 1;
      }
    }
  }

  centre(i: number, j: number): Point {
    return [-this.width / 2 + (i + 0.5) * this.step, -this.depth / 2 + (j + 0.5) * this.step];
  }

  private cell(p: Point): [number, number] {
    const i = Math.min(this.cols - 1, Math.max(0, Math.floor((p[0] + this.width / 2) / this.step)));
    const j = Math.min(this.rows - 1, Math.max(0, Math.floor((p[1] + this.depth / 2) / this.step)));
    return [i, j];
  }

  private open(i: number, j: number): boolean {
    return i >= 0 && j >= 0 && i < this.cols && j < this.rows && !this.blocked[j * this.cols + i];
  }

  isFree(p: Point): boolean {
    const [i, j] = this.cell(p);
    return this.open(i, j);
  }

  /** The nearest open cell to a point (itself, if open). */
  nearest(p: Point): Point {
    const [ci, cj] = this.cell(p);
    for (let ring = 0; ring < Math.max(this.cols, this.rows); ring++) {
      let best: Point | null = null;
      let bestD = Infinity;
      for (let j = cj - ring; j <= cj + ring; j++) {
        for (let i = ci - ring; i <= ci + ring; i++) {
          if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== ring || !this.open(i, j)) continue;
          const c = this.centre(i, j);
          const d = Math.hypot(c[0] - p[0], c[1] - p[1]);
          if (d < bestD) [best, bestD] = [c, d];
        }
      }
      if (best) return best;
    }
    return p;
  }

  /** Every open cell that can be walked to from a point. */
  reach(from: Point): Point[] {
    const [si, sj] = this.cell(this.nearest(from));
    const seen = new Uint8Array(this.cols * this.rows);
    const queue = [sj * this.cols + si];
    seen[queue[0]] = 1;
    const out: Point[] = [];
    while (queue.length) {
      const k = queue.pop()!;
      const i = k % this.cols;
      const j = (k - i) / this.cols;
      out.push(this.centre(i, j));
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = (j + dj) * this.cols + i + di;
        if (this.open(i + di, j + dj) && !seen[n]) {
          seen[n] = 1;
          queue.push(n);
        }
      }
    }
    return out;
  }

  /** Whether someone can walk the straight line between two points. */
  walkable(a: Point, b: Point): boolean {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.ceil(d / (this.step / 2));
    for (let k = 0; k <= n; k++) {
      const t = n ? k / n : 0;
      if (!this.isFree([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])) return false;
    }
    return true;
  }

  /** A walking route (A*, then straightened), or null if there is none. */
  path(from: Point, to: Point): Point[] | null {
    const [si, sj] = this.cell(this.nearest(from));
    const [ti, tj] = this.cell(this.nearest(to));
    const n = this.cols * this.rows;
    const g = new Float32Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const done = new Uint8Array(n);
    const start = sj * this.cols + si;
    const goal = tj * this.cols + ti;
    const heap: [number, number][] = [[0, start]];
    g[start] = 0;
    const h = (i: number, j: number) => Math.hypot(i - ti, j - tj);
    while (heap.length) {
      // A small binary heap, by estimated total.
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let k = 0;
        for (;;) {
          const l = 2 * k + 1;
          const r = l + 1;
          let m = k;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === k) break;
          [heap[k], heap[m]] = [heap[m], heap[k]];
          k = m;
        }
      }
      const cur = top[1];
      if (done[cur]) continue;
      done[cur] = 1;
      if (cur === goal) break;
      const i = cur % this.cols;
      const j = (cur - i) / this.cols;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          if (!this.open(i + di, j + dj)) continue;
          if (di && dj && (!this.open(i + di, j) || !this.open(i, j + dj))) continue;
          const next = (j + dj) * this.cols + i + di;
          const cost = g[cur] + (di && dj ? Math.SQRT2 : 1);
          if (cost < g[next]) {
            g[next] = cost;
            prev[next] = cur;
            heap.push([cost + h(i + di, j + dj), next]);
            let k = heap.length - 1;
            while (k > 0) {
              const p = (k - 1) >> 1;
              if (heap[p][0] <= heap[k][0]) break;
              [heap[p], heap[k]] = [heap[k], heap[p]];
              k = p;
            }
          }
        }
      }
    }
    if (!done[goal]) return null;
    const cells: Point[] = [];
    for (let k = goal; k !== -1; k = prev[k]) cells.push(this.centre(k % this.cols, Math.floor(k / this.cols)));
    cells.reverse();
    // Straighten: keep a corner only when the line past it is blocked.
    const out: Point[] = [cells[0]];
    let anchor = 0;
    for (let k = 2; k < cells.length; k++) {
      if (!this.walkable(cells[anchor], cells[k])) {
        out.push(cells[k - 1]);
        anchor = k - 1;
      }
    }
    if (cells.length > 1) out.push(cells[cells.length - 1]);
    return out;
  }
}
