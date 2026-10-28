import storyJson from '../data/story.json';
import type { CharacterConfig } from './character';
import { clients, registerBriefs, type Brief } from './clients';
import type { CustomerState, Visit } from './customers';
import type { Direction } from './scoring';
import type { SourcingState } from './sourcing';
import type { Formula } from './types';

// The story: your grandmother Mireille's shop, her formula book and the townspeople who
// remember her perfumes. Requests come in when their conditions are met; recreating a page's
// formula at 3 stars recovers that page, and anything less brings the customer back to try
// again. All story times are game hours. See src/data/story.json.

export interface Person {
  id: string;
  name: string;
  about: string;
  look: CharacterConfig;
}

export interface StoryRequest {
  id: string;
  person: string;
  /** All must hold: game hours since the start, reviews heard, requests done (and game hours since the last of them). */
  after: { gameHours?: number; reviews?: number; done?: string[]; hoursAfter?: number };
  /** Comes in by this game hour even if `after` hasn't happened. */
  latestGameHours?: number;
  greeting: string;
  retryGreeting?: string;
  thanks: string;
  gives?: { material: string; grams: number }[];
  giveText?: string;
  brief: Brief;
}

export interface Page {
  id: string;
  title: string;
  dated: string;
  /** Materials whose names have run as well as their amounts. */
  hiddenNames: string[];
  margin: string;
  /** The final, nearly blank page. */
  signature?: boolean;
  lesson?: { text: string; verified: boolean; check: string[] };
}

export interface StoryData {
  grandmother: string;
  retryAfterGameHours: number;
  intro: { title: string; paragraphs: string[]; letter: { heading: string; body: string[]; signoff: string }; start: string };
  bench: { material: string; grams: number }[];
  people: Person[];
  requests: StoryRequest[];
  pages: Page[];
}

export const story = storyJson as unknown as StoryData;
registerBriefs(story.requests.map((r) => r.brief));

export interface RequestState {
  status: 'waiting' | 'in-shop' | 'done';
  attempts: number;
  /** Game hour from which they come (back) in. */
  dueAt: number;
  /** Set once they've handed over what they brought. */
  gave?: boolean;
  doneAt?: number;
  /** What they said last time, to say again when they come back. */
  last?: { stars: number; directions: Direction[] };
}

export interface StoryState {
  introSeen: boolean;
  requests: Record<string, RequestState>;
  /** Page id → when it was recovered and for whom. */
  pages: Record<string, { at: number; for: string }>;
  /** Materials the story has given you (beyond reputation unlocks). */
  materials: string[];
}

export function newStoryState(): StoryState {
  return { introSeen: false, requests: {}, pages: {}, materials: [] };
}

export const requestById = (id: string, data: StoryData = story) => data.requests.find((r) => r.id === id);
export const personById = (id: string, data: StoryData = story) => data.people.find((p) => p.id === id);
export const pageById = (id: string, data: StoryData = story) => data.pages.find((p) => p.id === id);

/** Her formula for a page: the target of the request that recreates it. */
export function pageFormula(pageId: string, data: StoryData = story): Formula | undefined {
  return data.requests.find((r) => r.brief.page === pageId)?.brief.target.formula;
}

export function requestForPage(pageId: string, data: StoryData = story): StoryRequest | undefined {
  return data.requests.find((r) => r.brief.page === pageId);
}

/** The game hour a request first becomes due, or null if its conditions aren't met yet. */
export function firstDueAt(r: StoryRequest, s: StoryState, reviews: number, now: number): number | null {
  const a = r.after;
  let at = a.gameHours ?? 0;
  let met = reviews >= (a.reviews ?? 0);
  for (const id of a.done ?? []) {
    const done = s.requests[id];
    if (done?.status !== 'done' || done.doneAt === undefined) met = false;
    else at = Math.max(at, done.doneAt + (a.hoursAfter ?? 0));
  }
  if (met) return at;
  return r.latestGameHours !== undefined && now >= r.latestGameHours ? r.latestGameHours : null;
}

/**
 * Brings story requests up to date: anyone whose time has come walks in, if there's room
 * (one more than walk-ins may take, so the story never waits behind a full shop for long).
 * Returns the new visits' ids. `realNow` is the arrival timestamp (customer visits use real time).
 */
export function storyTick(s: StoryState, customers: CustomerState, now: number, realNow: number, data: StoryData = story, capacity = clients.timing.maxInShop + 1): string[] {
  const arrived: string[] = [];
  for (const r of data.requests) {
    if (customers.visits.filter((v) => v.status !== 'away').length >= capacity) break;
    let rs = s.requests[r.id];
    if (!rs) {
      const due = firstDueAt(r, s, customers.reviews.length, now);
      if (due === null) continue;
      rs = { status: 'waiting', attempts: 0, dueAt: due };
      s.requests[r.id] = rs;
    }
    if (rs.status !== 'waiting' || now < rs.dueAt) continue;
    const person = personById(r.person, data)!;
    const id = `s-${r.id}-${rs.attempts}`;
    customers.visits.push({ id, regularId: null, storyId: r.id, name: person.name, lookSeed: 0, briefId: r.brief.id, hintsAsked: rs.attempts > 0 ? r.brief.hints.length : 0, status: 'waiting', arrivedAt: realNow });
    rs.status = 'in-shop';
    arrived.push(id);
  }
  return arrived;
}

/** The first time you talk to them, they hand over what they brought. Returns what was given. */
export function meet(s: StoryState, visit: Visit, sourcing: SourcingState, now: number, data: StoryData = story): { material: string; grams: number }[] {
  const r = visit.storyId ? requestById(visit.storyId, data) : undefined;
  const rs = r && s.requests[r.id];
  if (!r || !rs || rs.gave || !r.gives) return [];
  rs.gave = true;
  for (const g of r.gives) {
    sourcing.inventory.push({ id: `l${sourcing.nextId++}`, material: g.material, grams: g.grams, quality: 1, since: now });
    if (!s.materials.includes(g.material)) s.materials.push(g.material);
  }
  return r.gives;
}

/**
 * After a story customer's review. A page request at 3 stars recovers the page and is done;
 * below that they'll come back to try again. Other requests are done either way.
 * Returns the recovered page's id, if any.
 */
export function afterReview(s: StoryState, visit: Visit, now: number, data: StoryData = story): string | null {
  const r = visit.storyId ? requestById(visit.storyId, data) : undefined;
  const rs = r && s.requests[r.id];
  if (!r || !rs || !visit.result) return null;
  rs.attempts += 1;
  rs.last = { stars: visit.result.stars, directions: visit.result.directions };
  const page = r.brief.page;
  if (page && visit.result.stars < 3) {
    rs.status = 'waiting';
    rs.dueAt = now + data.retryAfterGameHours;
    return null;
  }
  rs.status = 'done';
  rs.doneAt = now;
  if (!page) return null;
  s.pages[page] = { at: now, for: visit.name };
  return page;
}

export function validateStory(data: StoryData, materialIds: Set<string>): string[] {
  const errors: string[] = [];
  const people = new Set(data.people.map((p) => p.id));
  const requests = new Set(data.requests.map((r) => r.id));
  const pages = new Set(data.pages.map((p) => p.id));
  for (const b of data.bench) if (!materialIds.has(b.material)) errors.push(`story bench: unknown material "${b.material}"`);
  for (const r of data.requests) {
    if (!people.has(r.person)) errors.push(`story request "${r.id}": unknown person "${r.person}"`);
    for (const id of r.after.done ?? []) if (!requests.has(id)) errors.push(`story request "${r.id}": unknown request "${id}"`);
    for (const g of r.gives ?? []) if (!materialIds.has(g.material)) errors.push(`story request "${r.id}": unknown material "${g.material}"`);
    if (r.brief.page && !pages.has(r.brief.page)) errors.push(`story request "${r.id}": unknown page "${r.brief.page}"`);
    if (r.brief.page && !r.retryGreeting) errors.push(`story request "${r.id}": page requests need a retryGreeting`);
  }
  for (const p of data.pages) {
    if (!p.signature && !requestForPage(p.id, data)) errors.push(`page "${p.id}": no request recreates it`);
    if (p.lesson && p.lesson.verified !== (p.lesson.check.length === 0)) errors.push(`page "${p.id}": lesson verified must be true exactly when check is empty`);
    for (const m of p.hiddenNames) if (!materialIds.has(m)) errors.push(`page "${p.id}": unknown material "${m}"`);
  }
  return errors;
}
