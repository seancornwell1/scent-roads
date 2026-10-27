import clientsJson from '../data/clients.json';
import type { CharacterConfig } from './character';

// Customers, their memory briefs and hidden targets. See src/data/README.md.

export interface Target {
  /** Family id → weight; normalised when scored. */
  families: Record<string, number>;
  moods: string[];
  /** 1 (a whisper) to 5 (very strong). */
  strength: number;
  longevityHours: number;
}

export interface Brief {
  id: string;
  /** Unlock tier index needed before this brief can come up. */
  tier: number;
  memory: string;
  hints: string[];
  target: Target;
  pay: number;
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
  difficulties: Record<string, { stars: number[]; moodFullAt: number }>;
  weights: { stages: number; mood: number; strength: number; longevity: number };
  strengthBands: number[];
  strengthWords: string[];
  longevityFadeAt: number;
  longevityMaxHours: number;
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
  economy: { payShareAtWorstImpression: number; reputationForStars: number[] };
  lines: {
    impression: Band[];
    stageWords: Band[];
    stageNames: Record<string, string>;
    letDown: string;
    allGood: string;
    tooWeak: string;
    strengthOff: string;
    moodOff: string;
    chatter: string[];
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

export function findBrief(id: string, data: ClientsData = clients): Brief | undefined {
  return data.briefs.find((b) => b.id === id) ?? data.regulars.flatMap((r) => r.briefs).find((b) => b.id === id);
}

export function validateClients(data: ClientsData, familyIds: Set<string>, moods: Set<string>, tierCount: number): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const all = [...data.briefs, ...data.regulars.flatMap((r) => r.briefs)];
  for (const b of all) {
    if (ids.has(b.id)) errors.push(`brief "${b.id}": duplicate id`);
    ids.add(b.id);
    if (b.tier < 0 || b.tier >= tierCount) errors.push(`brief "${b.id}": tier out of range`);
    for (const f of Object.keys(b.target.families)) if (!familyIds.has(f)) errors.push(`brief "${b.id}": unknown family "${f}"`);
    for (const m of b.target.moods) if (!moods.has(m)) errors.push(`brief "${b.id}": unknown mood "${m}"`);
    if (b.target.strength < 1 || b.target.strength > 5) errors.push(`brief "${b.id}": strength must be 1–5`);
  }
  if (!data.scoring.difficulties[data.scoring.difficulty]) errors.push(`scoring: unknown difficulty "${data.scoring.difficulty}"`);
  if (data.economy.reputationForStars.length !== 5) errors.push('economy.reputationForStars needs five entries');
  return errors;
}
