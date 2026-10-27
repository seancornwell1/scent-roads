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

export interface Material {
  id: string;
  name: string;
  type: 'natural' | 'synthetic';
  family: string;
  layer: Layer;
  volatility: Volatility;
  character: string;
  behaviour?: string;
  origin: Origin;
  course: { mission: string | null; onBench: boolean };
  verified: boolean;
  check: string[];
  model: { strength: number; halfLifeHours: number };
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
  stages: Stage[];
  strengthBase: number;
  strengthPivot: number;
  loudness: { min: number; label: string }[];
  testStockGrams: number;
}

/** Material id → parts. Parts are actual material, as in the course's parts per 100. */
export type Formula = Record<string, number>;

export interface Content {
  families: Family[];
  materials: Material[];
  accords: Accord[];
  model: Model;
}
