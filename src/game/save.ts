import type { Formula } from './types';

// Saves live in this phone's browser storage. Times are real timestamps (ms since epoch).

export const SAVE_VERSION = 1;
const STORAGE_KEY = 'field-and-flacon/save';

export interface SavedFormula {
  id: string;
  name: string;
  parts: Formula;
  accords: string[];
  createdAt: number;
}

export interface SaveData {
  version: number;
  createdAt: number;
  /** Material id → grams on the bench. */
  stock: Record<string, number>;
  /** The formula currently on the organ. */
  draft: Formula;
  formulas: SavedFormula[];
  /** Accord id → when and in which formula it was first hit. */
  discoveredAccords: Record<string, { at: number; formula: Formula }>;
}

export function newSave(now: number, materialIds: string[], testStockGrams: number): SaveData {
  const stock: Record<string, number> = {};
  for (const id of materialIds) stock[id] = testStockGrams;
  return { version: SAVE_VERSION, createdAt: now, stock, draft: {}, formulas: [], discoveredAccords: {} };
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    return data.version === SAVE_VERSION ? data : null;
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage can be unavailable (private browsing); the game keeps running in memory.
  }
}
