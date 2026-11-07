import { radarData, SPOKES, type Values } from '../game/radar';
import type { Spoke } from '../game/types';
import { esc } from './html';

// The radar chart: a data chart (like the drydown graph), not drawn art. One axis per
// spoke; a polygon for each layer: the target, part of it as a ghost outline, a fading test
// ping, or your mix.

export type RadarLayer =
  | { kind: 'target' | 'mix'; values: Values }
  /** Only part of the target's outline: around these spokes. */
  | { kind: 'ghost'; values: Values; spokes: Spoke[] }
  /** A test ping: shows, then fades over `ms`; `elapsed` keeps it fading across redraws. */
  | { kind: 'ping'; values: Values; ms: number; elapsed: number };

const R = 88;
const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / SPOKES.length;

function point(i: number, value: number, scale: number): [number, number] {
  const r = Math.min(1.12, scale > 0 ? value / scale : 0) * R;
  return [Math.cos(angle(i)) * r, Math.sin(angle(i)) * r];
}

const fmt = ([x, y]: [number, number]) => `${x.toFixed(1)},${y.toFixed(1)}`;

function polygon(values: Values, scale: number): string {
  return SPOKES.map((s, i) => fmt(point(i, values[s], scale))).join(' ');
}

/** The outline around the given spokes: from halfway along each neighbouring edge, through the spoke. */
function ghost(values: Values, spokes: Spoke[], scale: number): string {
  const n = SPOKES.length;
  return spokes
    .map((s) => {
      const i = SPOKES.indexOf(s);
      const here = point(i, values[s], scale);
      const prev = point((i + n - 1) % n, values[SPOKES[(i + n - 1) % n]], scale);
      const next = point((i + 1) % n, values[SPOKES[(i + 1) % n]], scale);
      const mid = (a: [number, number]): [number, number] => [(a[0] + here[0]) / 2, (a[1] + here[1]) / 2];
      return `<polyline class="radar-ghost" points="${fmt(mid(prev))} ${fmt(here)} ${fmt(mid(next))}" /><circle class="radar-ghost-dot" cx="${here[0].toFixed(1)}" cy="${here[1].toFixed(1)}" r="3" />`;
    })
    .join('');
}

/**
 * A radar chart. `scale` is the value that reaches the outer ring. Spokes in `pulse` are
 * highlighted (an accord just pushed them).
 */
export function radarChart(layers: RadarLayer[], scale: number, pulse: Spoke[] = []): string {
  const rings = [1 / 3, 2 / 3, 1].map((f) => `<polygon class="radar-ring" points="${SPOKES.map((_, i) => fmt([Math.cos(angle(i)) * R * f, Math.sin(angle(i)) * R * f])).join(' ')}" />`).join('');
  const axes = SPOKES.map((s, i) => {
    const [x, y] = [Math.cos(angle(i)) * R, Math.sin(angle(i)) * R];
    const [lx, ly] = [Math.cos(angle(i)) * (R + 16), Math.sin(angle(i)) * (R + 16)];
    const name = radarData.spokes.find((x) => x.id === s)!.name;
    const anchor = Math.abs(lx) < 4 ? 'middle' : lx > 0 ? 'start' : 'end';
    return `<line class="radar-axis${pulse.includes(s) ? ' radar-axis--pulse' : ''}" x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" />
      <text class="radar-label${pulse.includes(s) ? ' radar-label--pulse' : ''}" x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${anchor}">${esc(name)}</text>`;
  }).join('');
  const shapes = layers
    .map((l) => {
      if (l.kind === 'ghost') return ghost(l.values, l.spokes, scale);
      if (l.kind === 'ping') {
        return `<polygon class="radar-ping" points="${polygon(l.values, scale)}" style="animation-duration:${l.ms}ms;animation-delay:-${Math.min(l.elapsed, l.ms)}ms" />`;
      }
      return `<polygon class="radar-${l.kind}" points="${polygon(l.values, scale)}" />`;
    })
    .join('');
  return `<svg class="radar" viewBox="-150 -125 300 250" role="img" aria-label="Radar chart">${rings}${axes}${shapes}</svg>`;
}

/** The scale for a round: the target's biggest spoke, with room to overshoot. */
export function scaleFor(target: Values): number {
  return Math.max(...SPOKES.map((s) => target[s])) * 1.5 || 1;
}
