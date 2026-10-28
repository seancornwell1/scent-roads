import type { CharacterConfig } from './character';
import type { Clock } from './clock';
import type { CustomerState } from './customers';
import type { DisplayState } from './display';
import type { NewsItem } from './events';
import type { SourcingState } from './sourcing';
import type { Base, Dilutions, Entry } from './blend';
import type { LearningState } from './learning';
import type { ExamState } from './ranks';
import type { AwardsState } from './awards';
import type { LabState } from './lab';
import type { RoutesState } from './routes';
import type { SignatureState } from './signature';
import type { StoryState } from './story';
import type { UpgradeState } from './upgrades';
import type { Formula } from './types';

// Saves live in this phone's browser storage. Times are real timestamps (ms since epoch).

/** Version 2 (Direction change #2: the story, 10-part formulas, 1–3 stars) starts a new game. */
export const SAVE_VERSION = 2;
const STORAGE_KEY = 'field-and-flacon/save';

export interface SavedFormula {
  id: string;
  name: string;
  parts: Formula;
  /** Dilution of each material, if not neat (Phase D). */
  dilutions?: Dilutions;
  accords: string[];
  createdAt: number;
}

export interface SaveData {
  version: number;
  createdAt: number;
  /** The formula currently on the organ, and the dilution of each material in it. */
  draft: Formula;
  draftDilutions?: Dilutions;
  /** The brief the organ's formula was made for: a different order starts on a clean organ. */
  draftFor?: string;
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
  /** The story: her book's recovered pages, townspeople's requests (filled in on load). */
  story?: StoryState;
  /** Her supply network: growers' and the chemist's letters, and which routes are open (Phase B; filled in on load). */
  routes?: RoutesState;
  /** Material uses, your own notes and nose training (Phase C; filled in on load). */
  learning?: LearningState;
  /** Your rank (Phase D): apprentice until you pass an exam. */
  rank?: string;
  /** An exam in progress. */
  exam?: ExamState | null;
  /** Your saved accords, usable as bases in larger formulas. */
  bases?: Base[];
  /** Family profiles of recent perfumes handed over: the shop's style. */
  styleHistory?: Record<string, number>[];
  /** Her signature perfume: clues seen, her jar, your attempts (Phase E). */
  signature?: SignatureState;
  /** The yearly awards: your entries and the judges' verdicts. */
  awards?: AwardsState;
  /** The analysis lab and reconstruction challenges (Phase F). */
  lab?: LabState;
}

export type { Entry };

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
