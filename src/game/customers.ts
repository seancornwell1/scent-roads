import { canAnswer, clients, findBrief, type Brief, type ClientsData, type Regular } from './clients';
import type { Entry } from './blend';
import type { ScoreResult } from './scoring';
import { gameHoursToMs, realMinutesToMs } from './time';
import type { Formula } from './types';

// Customer visits, driven by timestamps so the shop keeps living while the app is closed.
// A visit: arrives and waits with a brief → you hand over a perfume → they go away →
// they return with a review → done. Regulars come back for their next brief later.

export type VisitStatus = 'waiting' | 'away' | 'returning';

export interface Visit {
  id: string;
  regularId: string | null;
  /** A townsperson's story request (src/data/story.json), if this is one. */
  storyId?: string;
  name: string;
  /** Seed for a walk-in's random look (regulars always look the same). */
  lookSeed: number;
  briefId: string;
  hintsAsked: number;
  status: VisitStatus;
  arrivedAt: number;
  /** What you handed over: the formula as written, and (Phase D) the blend it expands to. */
  perfume?: { name: string; parts: Formula; entries?: Entry[]; handedAt: number; paid: number; bonus?: number };
  /** From the shop's appeal when they arrived: better shops draw better-paying, more demanding customers. */
  payMultiplier?: number;
  strictness?: number;
  result?: ScoreResult;
  reviewDueAt?: number;
}

export interface PastPerfume {
  perfume: string;
  stars: number;
  weakStage: string | null;
  at: number;
}

export interface ReviewRecord extends PastPerfume {
  name: string;
  briefId: string;
  reputation: number;
}

export interface CustomerState {
  money: number;
  reputation: number;
  visits: Visit[];
  nextArrivalAt: number;
  /** Regular id → index of their next brief, and when they may next come in. */
  regulars: Record<string, { nextBrief: number; nextVisitAt: number; history: PastPerfume[] }>;
  reviews: ReviewRecord[];
}

export function newCustomerState(now: number): CustomerState {
  return { money: 0, reputation: 0, visits: [], nextArrivalAt: now, regulars: {}, reviews: [] };
}

const inShop = (s: CustomerState) => s.visits.filter((v) => v.status !== 'away').length;

function regularDue(s: CustomerState, now: number, owned: Set<string>, random: () => number, data: ClientsData, c: ArrivalConditions) {
  const regularsIn = s.visits.filter((v) => v.regularId && v.status !== 'away').length;
  if (regularsIn >= data.timing.maxRegularsInShop || random() >= data.timing.regularChance) return undefined;
  return data.regulars.find((r) => {
    if (s.visits.some((v) => v.regularId === r.id)) return false;
    const progress = s.regulars[r.id] ?? { nextBrief: 0, nextVisitAt: 0, history: [] };
    const brief = r.briefs[progress.nextBrief];
    return brief !== undefined && canAnswer(brief, owned) && (c.canTake?.(brief) ?? true) && (c.welcomes?.(r) ?? true) && progress.nextVisitAt <= now;
  });
}

function pickWalkInBrief(s: CustomerState, owned: Set<string>, random: () => number, data: ClientsData, c: ArrivalConditions): Brief | undefined {
  const open = data.briefs.filter((b) => canAnswer(b, owned) && (c.canTake?.(b) ?? true));
  if (open.length === 0) return undefined;
  const fresh = open.filter((b) => !s.visits.some((v) => v.briefId === b.id));
  const pool = fresh.length > 0 ? fresh : open;
  // The shop's style tips the odds towards briefs like what you've been making.
  const weights = pool.map((b) => c.weightOf?.(b) ?? 1);
  let pick = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) if ((pick -= weights[i]) < 0) return pool[i];
  return pool[pool.length - 1];
}

/**
 * Brings the shop up to date: reviews that are due come back, and new customers arrive
 * on schedule (up to the shop's capacity). Returns ids of visits that changed.
 */
export interface ArrivalConditions {
  /** Multiplies the time between arrivals (below 1 = more customers). */
  arrivalMultiplier: number;
  payMultiplier: number;
  strictness: number;
  /** Briefs your rank lets you take (dilutions, budgets); all by default. */
  canTake?: (b: Brief) => boolean;
  /** How strongly each brief is drawn by the shop's style (1 = no pull); 1 by default. */
  weightOf?: (b: Brief) => number;
  /** Whether a regular comes in at all (some only visit a shop that leans their way). */
  welcomes?: (r: Regular) => boolean;
}

const NORMAL: ArrivalConditions = { arrivalMultiplier: 1, payMultiplier: 1, strictness: 0 };

export function tick(
  s: CustomerState,
  now: number,
  /** Materials you have: customers only bring briefs you can answer. */
  owned: Set<string>,
  random: () => number,
  conditions: ArrivalConditions = NORMAL,
  data: ClientsData = clients,
): string[] {
  const changed: string[] = [];
  for (const v of s.visits) {
    if (v.status === 'away' && v.reviewDueAt !== undefined && v.reviewDueAt <= now) {
      v.status = 'returning';
      changed.push(v.id);
    }
  }
  const interval = realMinutesToMs(data.timing.arrivalEveryRealMinutes * conditions.arrivalMultiplier);
  const extra = { payMultiplier: conditions.payMultiplier, strictness: conditions.strictness };
  for (let guard = 0; s.nextArrivalAt <= now && guard < 50; guard++) {
    if (inShop(s) >= data.timing.maxInShop) {
      s.nextArrivalAt = now + interval;
      break;
    }
    const regular = regularDue(s, now, owned, random, data, conditions);
    const id = `v${s.nextArrivalAt.toString(36)}${Math.floor(random() * 1e6).toString(36)}`;
    if (regular) {
      const progress = s.regulars[regular.id] ?? { nextBrief: 0, nextVisitAt: 0, history: [] };
      s.regulars[regular.id] = progress;
      s.visits.push({ id, regularId: regular.id, name: regular.name, lookSeed: 0, briefId: regular.briefs[progress.nextBrief].id, hintsAsked: 0, status: 'waiting', arrivedAt: s.nextArrivalAt, ...extra });
    } else {
      const brief = pickWalkInBrief(s, owned, random, data, conditions);
      if (!brief) {
        s.nextArrivalAt = now + interval;
        break;
      }
      const name = data.walkInNames[Math.floor(random() * data.walkInNames.length)];
      s.visits.push({ id, regularId: null, name, lookSeed: Math.floor(random() * 2 ** 31), briefId: brief.id, hintsAsked: 0, status: 'waiting', arrivedAt: s.nextArrivalAt, ...extra });
    }
    changed.push(id);
    s.nextArrivalAt += interval;
  }
  return changed;
}

/** Gives a waiting customer their perfume: they pay now (nothing for a one-star perfume) and come back later with a review. */
export function handOver(s: CustomerState, visitId: string, perfume: { name: string; parts: Formula; entries?: Entry[] }, result: ScoreResult, now: number, data: ClientsData = clients): number {
  const v = s.visits.find((x) => x.id === visitId);
  const brief = v && findBrief(v.briefId, data);
  if (!v || !brief || v.status !== 'waiting') return 0;
  const paid = Math.round(brief.pay * (v.payMultiplier ?? 1) * (data.economy.payForStars[result.stars - 1] ?? 1));
  s.money += paid;
  v.perfume = { ...perfume, handedAt: now, paid };
  v.result = result;
  v.status = 'away';
  v.reviewDueAt = now + gameHoursToMs(data.timing.reviewAfterGameHours);
  return paid;
}

/** The bonus a 3-star perfume earns when its review comes in (0 for fewer stars). */
export function bonusFor(v: Visit, data: ClientsData = clients): number {
  const brief = findBrief(v.briefId, data);
  if (!brief || v.result?.stars !== 3) return 0;
  return Math.round(brief.pay * (v.payMultiplier ?? 1) * data.economy.threeStarBonus);
}

/** Hears a returning customer's review: reputation changes, a 3-star perfume earns its bonus, and the visit ends. Returns the reputation change. */
export function completeReview(s: CustomerState, visitId: string, now: number, data: ClientsData = clients): number {
  const v = s.visits.find((x) => x.id === visitId);
  if (!v || v.status !== 'returning' || !v.result || !v.perfume) return 0;
  const change = data.economy.reputationForStars[v.result.stars - 1] ?? 0;
  s.reputation = Math.max(0, s.reputation + change);
  s.money += bonusFor(v, data);
  const past: PastPerfume = { perfume: v.perfume.name, stars: v.result.stars, weakStage: v.result.weakStage, at: now };
  s.reviews.push({ ...past, name: v.name, briefId: v.briefId, reputation: change });
  if (v.regularId) {
    const progress = s.regulars[v.regularId] ?? { nextBrief: 0, nextVisitAt: 0, history: [] };
    progress.history.push(past);
    progress.nextBrief += 1;
    progress.nextVisitAt = now + gameHoursToMs(data.timing.regularReturnsAfterGameHours);
    s.regulars[v.regularId] = progress;
  }
  s.visits = s.visits.filter((x) => x.id !== visitId);
  return change;
}
