import type { CharacterConfig } from './character';
import type { Clock } from './clock';
import type { CustomerState } from './customers';
import type { DisplayState } from './display';
import type { NewsItem } from './events';
import type { SourcingState } from './sourcing';
import type { UpgradeState } from './upgrades';
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
  /** The formula currently on the organ. */
  draft: Formula;
  formulas: SavedFormula[];
  /** Accord id → when and in which formula it was first hit. */
  discoveredAccords: Record<string, { at: number; formula: Formula }>;
  /** The player's look; missing until the character creator has been used. */
  character?: CharacterConfig;
  /** Money, reputation, customer visits and regulars (added in step 4; filled in on load). */
  customers?: CustomerState;
  /** Highest unlock tier the player has been told about. */
  announcedTier?: number;
  /** The game clock (step 5; filled in on load). */
  clock?: Clock;
  /** Harvests, processing, shipments, crates and inventory (step 5; filled in on load). */
  sourcing?: SourcingState;
  /** Furniture, opened regions and processing levels (step 6; filled in on load). */
  upgrades?: UpgradeState;
  /** Signature perfumes on display (step 6). */
  display?: DisplayState;
  /** Game week → that week's newspaper, fixed once printed. */
  news?: Record<number, NewsItem[]>;
  /** The latest week whose paper you've read. */
  newsSeenWeek?: number;
  /** Optional notifications for ripe harvests and arrivals. */
  notify?: boolean;
  /** Sound volume, 0 (off) to 1; 0.8 when unset. */
  sound?: number;
}

/** Checks that text looks like a save from this game before importing it. */
export function parseSave(text: string): SaveData | null {
  try {
    const data = JSON.parse(text) as SaveData;
    if (data.version !== SAVE_VERSION || typeof data.createdAt !== 'number' || typeof data.draft !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

export function newSave(now: number): SaveData {
  return { version: SAVE_VERSION, createdAt: now, draft: {}, formulas: [], discoveredAccords: {} };
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
