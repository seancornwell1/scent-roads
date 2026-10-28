import clientsJson from '../data/clients.json';
import type { CharacterConfig } from './character';
import type { Formula } from './types';

// Customers, their memory briefs and hidden targets. See src/data/README.md.

/** The hidden target: a reference formula (in wearable parts) the customer has in mind. */
export interface Target {
  formula: Formula;
}

export interface Brief {
  id: string;
  memory: string;
  hints: string[];
  target: Target;
  pay: number;
  /** For story requests: the page of her formula book this recreates. */
  page?: string;
}

export interface Regular {
  id: string;
  name: string;
  about: string;
  look: CharacterConfig;
  greeting: string;
  remember: { minStars: number; text: string }[];
  briefs: Brief[];
}

export interface Band {
  min: number;
  text: string;
}

export interface ScoringConfig {
  difficulty: string;
  /** Closeness needed for 2 and 3 stars. */
  difficulties: Record<string, { stars: number[] }>;
  weights: { stages: number; strength: number; longevity: number };
  /** Family-share differences smaller than this aren't worth mentioning. */
  tolerance: number;
  longevityFadeAt: number;
  longevityMaxHours: number;
}

export interface FeedbackLines {
  stages: Record<string, string>;
  amounts: Band[];
  families: Record<string, { more: string; less: string }>;
  vague: string;
  specific: string[];
  strength: { more: string; less: string };
  longevity: { more: string; less: string };
  perfect: string;
  lastTime: string;
}

export interface ClientsData {
  timing: {
    arrivalEveryRealMinutes: number;
    maxInShop: number;
    reviewAfterGameHours: number;
    regularReturnsAfterGameHours: number;
    browseSeconds: [number, number];
    /** Chance that an arrival is a regular whose next visit is due. */
    regularChance: number;
    maxRegularsInShop: number;
  };
  scoring: ScoringConfig;
  /** Reputation for 1, 2 and 3 stars; 3 stars also pays a bonus share of the brief's pay. */
  economy: { reputationForStars: number[]; threeStarBonus: number };
  lines: {
    impression: Band[];
    stageWords: Band[];
    stageNames: Record<string, string>;
    letDown: string;
    allGood: string;
    chatter: string[];
    feedback: FeedbackLines;
  };
  walkInNames: string[];
  briefs: Brief[];
  regulars: Regular[];
}

export const clients = clientsJson as unknown as ClientsData;

export function bandText(bands: Band[], value: number): string {
  return bands.find((b) => value >= b.min)?.text ?? bands[bands.length - 1].text;
}

export function fillTemplate(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
}

/** Every brief the game knows: walk-ins and regulars here, plus any extra (story requests). */
let extraBriefs: Brief[] = [];
export function registerBriefs(briefs: Brief[]): void {
  extraBriefs = briefs;
}

export function findBrief(id: string, data: ClientsData = clients): Brief | undefined {
  return data.briefs.find((b) => b.id === id) ?? data.regulars.flatMap((r) => r.briefs).find((b) => b.id === id) ?? extraBriefs.find((b) => b.id === id);
}

/** True when every material in the brief's target is one you have. */
export function canAnswer(brief: Brief, owned: Set<string>): boolean {
  return Object.keys(brief.target.formula).every((id) => owned.has(id));
}

export function validateBriefs(briefs: Brief[], materialIds: Set<string>, wearableParts: number, familyIds: Set<string>, data: ClientsData = clients): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const b of briefs) {
    if (ids.has(b.id)) errors.push(`brief "${b.id}": duplicate id`);
    ids.add(b.id);
    const parts = Object.values(b.target.formula);
    for (const m of Object.keys(b.target.formula)) if (!materialIds.has(m)) errors.push(`brief "${b.id}": unknown material "${m}"`);
    if (parts.reduce((a, p) => a + p, 0) !== wearableParts) errors.push(`brief "${b.id}": target must total ${wearableParts} parts`);
    if (parts.some((p) => !Number.isInteger(p) || p <= 0)) errors.push(`brief "${b.id}": target parts must be whole numbers`);
  }
  for (const f of familyIds) if (!data.lines.feedback.families[f]) errors.push(`feedback: no words for family "${f}"`);
  return errors;
}

export function validateClients(data: ClientsData, materialIds: Set<string>, wearableParts: number, familyIds: Set<string>): string[] {
  const errors = validateBriefs([...data.briefs, ...data.regulars.flatMap((r) => r.briefs)], materialIds, wearableParts, familyIds, data);
  if (!data.scoring.difficulties[data.scoring.difficulty]) errors.push(`scoring: unknown difficulty "${data.scoring.difficulty}"`);
  if (data.economy.reputationForStars.length !== 3) errors.push('economy.reputationForStars needs three entries');
  return errors;
}
