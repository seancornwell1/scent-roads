// Shapes of the content in src/data/. See src/data/README.md for the documented schemas.

export type Layer = 'top' | 'heart' | 'base';
export type Volatility = 'very high' | 'high' | 'medium' | 'low' | 'very low';

export const LAYERS: readonly Layer[] = ['top', 'heart', 'base'];
export const VOLATILITIES: readonly Volatility[] = ['very high', 'high', 'medium', 'low', 'very low'];

export interface Family {
  id: string;
  name: string;
  description: string;
  /** Moods this family lends a perfume (used when scoring against a brief). */
  moods: string[];
}

export interface Origin {
  plant?: string;
  region?: string;
  method?: string;
  note?: string;
}

/** Reference numbers from public sources, with their own verification (Phase C). */
export interface MaterialRef {
  /** Roughly when it entered perfumery: a synthetic's first use, a natural's era. */
  year: number;
  /** Hours it stays noticeable on a smelling strip. */
  tenacityHours: number;
  /** Strength it's usually worked at, in percent: 100, 10 or 1. */
  dilution: 100 | 10 | 1;
  /** Maximum percent in a finished fine fragrance (IFRA), or null if not restricted. */
  ifraLimit: number | null;
  /** Rough price per kilo, in euros. */
  costPerKg: number;
  verified: boolean;
  check: string[];
}

export interface Material {
  id: string;
  name: string;
  type: 'natural' | 'synthetic';
  family: string;
  subfamily: string;
  layer: Layer;
  volatility: Volatility;
  character: string;
  behaviour?: string;
  origin: Origin;
  course: { mission: string | null; onBench: boolean };
  verified: boolean;
  check: string[];
  model: { strength: number; halfLifeHours: number };
  ref: MaterialRef;
}

/** One requirement of an accord, as a percentage of the formula's total parts. */
export interface Condition {
  materials?: string[];
  family?: string;
  layer?: Layer;
  min?: number;
  max?: number;
}

export interface Accord {
  id: string;
  name: string;
  description: string;
  course: { mission: string | null };
  verified: boolean;
  check: string[];
  requires: Condition[];
}

export interface Stage {
  id: string;
  name: string;
  hours: number;
  label: string;
}

export interface Model {
  /** Parts a wearable perfume must total (10 at first; 100 and 1000 come with later ranks). */
  wearableParts: number;
  stages: Stage[];
  strengthBase: number;
  strengthPivot: number;
  loudness: { min: number; label: string }[];
}

/** Material id → parts. Parts are actual material, as in the course's parts per 100. */
export type Formula = Record<string, number>;

export interface Content {
  families: Family[];
  materials: Material[];
  accords: Accord[];
  model: Model;
}
