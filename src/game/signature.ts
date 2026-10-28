import signatureJson from '../data/signature.json';
import type { Brief } from './clients';
import type { ScoreResult } from './scoring';
import { stockOf, takeStock, type SourcingState } from './sourcing';

// The ending: her signature perfume, the last page of her book. Its makeup comes out in
// clues along three paths (the town, her growers' routes, and the craft itself); enough of
// them, from any mix, unlock the final brief. It also needs labdanum aged in her jar, in real
// time, started long before. The epilogue reflects the path you took. Times are game hours.

export type CluePath = 'town' | 'routes' | 'craft';

export interface Clue {
  id: string;
  path: CluePath;
  /** What reveals it: a story request done, a route open, a page recovered, a rank reached, or reviews heard. */
  when: { request?: string; route?: string; page?: string; rank?: string; reviews?: number };
  from: string;
  text: string;
}

export interface SignatureData {
  title: string;
  needed: number;
  jar: { name: string; material: string; grams: number; gameDays: number; about: string };
  brief: Brief;
  clues: Clue[];
  epilogue: {
    title: string;
    opening: string[];
    byPath: Record<CluePath, string>;
    pages: string;
    style: string;
    rank: string;
    closing: string;
  };
}

export const signature = signatureJson as unknown as SignatureData;

export interface SignatureState {
  /** When the jar was started, in game hours. */
  jarStartedAt?: number;
  /** Clues already announced. */
  cluesSeen: string[];
  /** The best attempt at her perfume so far. */
  result?: ScoreResult;
  completedAt?: number;
}

export function newSignatureState(): SignatureState {
  return { cluesSeen: [] };
}

/** What the game knows about your progress, for the clues. */
export interface ClueContext {
  requestsDone: Set<string>;
  routesOpen: Set<string>;
  pages: Set<string>;
  /** Rank ids reached (yours and the ones below it). */
  ranks: Set<string>;
  reviews: number;
}

export function clueFound(c: Clue, ctx: ClueContext): boolean {
  const w = c.when;
  return (
    (w.request === undefined || ctx.requestsDone.has(w.request)) &&
    (w.route === undefined || ctx.routesOpen.has(w.route)) &&
    (w.page === undefined || ctx.pages.has(w.page)) &&
    (w.rank === undefined || ctx.ranks.has(w.rank)) &&
    (w.reviews === undefined || ctx.reviews >= w.reviews)
  );
}

export function cluesFound(ctx: ClueContext, data: SignatureData = signature): Clue[] {
  return data.clues.filter((c) => clueFound(c, ctx));
}

export function briefUnlocked(found: Clue[], data: SignatureData = signature): boolean {
  return found.length >= data.needed;
}

export function jarReady(s: SignatureState, now: number, data: SignatureData = signature): boolean {
  return s.jarStartedAt !== undefined && now - s.jarStartedAt >= data.jar.gameDays * 24;
}

/** Game hours until the jar is ready (0 when ready, null if not started). */
export function jarHoursLeft(s: SignatureState, now: number, data: SignatureData = signature): number | null {
  if (s.jarStartedAt === undefined) return null;
  return Math.max(0, s.jarStartedAt + data.jar.gameDays * 24 - now);
}

/** Starts her jar with neat material from stock. Returns why not, or null. */
export function startJar(s: SignatureState, stock: SourcingState, now: number, data: SignatureData = signature): string | null {
  if (s.jarStartedAt !== undefined) return 'The jar is already ageing.';
  if (stockOf(stock, data.jar.material) + 1e-9 < data.jar.grams) return `You need ${data.jar.grams} g of neat ${data.jar.material} to start the jar.`;
  takeStock(stock, data.jar.material, 100, data.jar.grams, now);
  s.jarStartedAt = now;
  return null;
}

/** The path that gave you the most clues (ties go to the town, then the routes). */
export function mainPath(found: Clue[]): CluePath {
  const count = (p: CluePath) => found.filter((c) => c.path === p).length;
  return (['town', 'routes', 'craft'] as const).reduce((best, p) => (count(p) > count(best) ? p : best), 'town');
}

/** The epilogue, reflecting your path. */
export function epilogueText(found: Clue[], facts: { pages: number; style: string | null; rank: string }, data: SignatureData = signature): string[] {
  const e = data.epilogue;
  return [
    ...e.opening,
    e.byPath[mainPath(found)],
    e.pages.replace('{pages}', String(facts.pages)),
    ...(facts.style ? [e.style.replace('{style}', facts.style)] : []),
    e.rank.replace('{rank}', facts.rank.toLowerCase()),
    e.closing,
  ];
}

export function validateSignature(data: SignatureData, materialIds: Set<string>, ids: { requests: Set<string>; routes: Set<string>; pages: Set<string>; ranks: Set<string> }): string[] {
  const errors: string[] = [];
  if (data.needed > data.clues.length) errors.push('signature: needs more clues than exist');
  for (const id of Object.keys(data.brief.target.formula)) if (!materialIds.has(id)) errors.push(`signature: unknown material "${id}"`);
  if (!materialIds.has(data.jar.material)) errors.push(`signature: unknown jar material "${data.jar.material}"`);
  for (const c of data.clues) {
    const w = c.when;
    if (w.request && !ids.requests.has(w.request)) errors.push(`clue "${c.id}": unknown request`);
    if (w.route && !ids.routes.has(w.route)) errors.push(`clue "${c.id}": unknown route`);
    if (w.page && !ids.pages.has(w.page)) errors.push(`clue "${c.id}": unknown page`);
    if (w.rank && !ids.ranks.has(w.rank)) errors.push(`clue "${c.id}": unknown rank`);
  }
  for (const p of ['town', 'routes', 'craft'] as const) if (!data.clues.some((c) => c.path === p)) errors.push(`signature: no clue from the ${p}`);
  return errors;
}
