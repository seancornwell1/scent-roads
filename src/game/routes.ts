import lettersJson from '../data/letters.json';
import { dateAt } from './clock';
import { seasonOf } from './clock';

// Her supply network. Growers (and her old chemist) went quiet when she died; each season
// is a chapter in which some of them write. Answering a letter reopens that route once the
// reply comes back, and you can only wait on one reply at a time, so you choose who's next.
// Crates from an open route arrive with a short letter. Times are game hours.

export const CHEMIST = 'chemist';

export interface RouteData {
  /** A region id from regions.json, or "chemist". */
  id: string;
  from: string;
  about: string;
  first: string[];
  reply: string[];
  /** Notes tucked into crates, in turn; `{material}` and `{quality}` fill in. */
  crate: string[];
}

export interface Chapter {
  title: string;
  text: string;
  /** Routes whose first letter arrives when the chapter begins. */
  letters: string[];
}

export interface LettersData {
  replyGameHours: number;
  routes: RouteData[];
  chapters: Chapter[];
}

export const letters = lettersJson as LettersData;

export interface Letter {
  id: string;
  route: string;
  kind: 'first' | 'reply' | 'crate';
  at: number;
  body: string[];
  read: boolean;
}

export interface RouteState {
  /** waiting: their letter is waiting for your answer; replied: your answer is on its way. */
  status: 'waiting' | 'replied' | 'open';
  opensAt?: number;
}

export interface RoutesState {
  routes: Record<string, RouteState>;
  letters: Letter[];
  /** Highest chapter whose letters have been delivered (-1 before the first). */
  chapter: number;
  /** Route id → crates received, to take turns through their notes. */
  crates: Record<string, number>;
  nextId: number;
}

export function newRoutesState(): RoutesState {
  return { routes: {}, letters: [], chapter: -1, crates: {}, nextId: 1 };
}

export const routeById = (id: string, data: LettersData = letters) => data.routes.find((r) => r.id === id);

export function routeOpen(s: RoutesState, id: string): boolean {
  return s.routes[id]?.status === 'open';
}

/** The chapter (one per season, counting from the start) at a game time. */
export function chapterAt(gameHours: number, start: { month: number; day: number }): number {
  const d = dateAt(gameHours, start);
  const months = (d.year - 1) * 12 + d.month - start.month;
  return Math.max(0, Math.floor(months / 3));
}

/** A chapter's title and text; past the written ones, just the season and year. */
export function chapterInfo(index: number, start: { month: number }, data: LettersData = letters): Chapter & { season: string } {
  const month = ((start.month - 1 + index * 3) % 12) + 1;
  const season = seasonOf(month);
  const written = data.chapters[index];
  return written ? { ...written, season } : { title: `${season}, year ${Math.floor(index / 4) + 1}`, text: '', letters: [], season };
}

function deliver(s: RoutesState, route: string, kind: Letter['kind'], body: string[], at: number): Letter {
  const letter = { id: `m${s.nextId++}`, route, kind, at, body, read: false };
  s.letters.push(letter);
  return letter;
}

/**
 * Brings the post up to date: a new chapter's letters arrive, and replies that have come
 * back reopen their routes. Returns the new chapter (if one began) and the routes opened.
 */
export function routesTick(s: RoutesState, now: number, start: { month: number; day: number }, data: LettersData = letters): { chapter: number | null; opened: string[] } {
  const current = chapterAt(now, start);
  const began = current > s.chapter ? current : null;
  while (s.chapter < current) {
    s.chapter += 1;
    for (const id of chapterInfo(s.chapter, start, data).letters) {
      const route = routeById(id, data);
      if (!route || s.routes[id]) continue;
      s.routes[id] = { status: 'waiting' };
      deliver(s, id, 'first', route.first, now);
    }
  }
  const opened: string[] = [];
  for (const [id, r] of Object.entries(s.routes)) {
    if (r.status !== 'replied' || r.opensAt === undefined || r.opensAt > now) continue;
    r.status = 'open';
    delete r.opensAt;
    deliver(s, id, 'reply', routeById(id, data)?.reply ?? [], now);
    opened.push(id);
  }
  return { chapter: began, opened };
}

/** The route whose reply you're waiting on, if any. */
export function inTransit(s: RoutesState): string | null {
  return Object.entries(s.routes).find(([, r]) => r.status === 'replied')?.[0] ?? null;
}

/** Writes back to a grower (or the chemist). Returns null on success, or why not. */
export function answer(s: RoutesState, id: string, now: number, data: LettersData = letters): string | null {
  const r = s.routes[id];
  if (!r || r.status !== 'waiting') return 'There is no letter from them to answer.';
  const waiting = inTransit(s);
  if (waiting) return `You're already waiting for ${routeById(waiting, data)?.from ?? 'a reply'} to write back. Answer one letter at a time.`;
  r.status = 'replied';
  r.opensAt = now + data.replyGameHours;
  for (const l of s.letters) if (l.route === id) l.read = true;
  return null;
}

/** The note tucked into a crate from an open route. */
export function crateLetter(s: RoutesState, id: string, now: number, fill: { material: string; quality: string }, data: LettersData = letters): Letter | null {
  const route = routeById(id, data);
  if (!route || route.crate.length === 0) return null;
  const n = s.crates[id] ?? 0;
  s.crates[id] = n + 1;
  const text = route.crate[n % route.crate.length].replace(/\{(\w+)\}/g, (_, key: string) => fill[key as keyof typeof fill] ?? '');
  return deliver(s, id, 'crate', [text], now);
}

export function unreadLetters(s: RoutesState): number {
  return s.letters.filter((l) => !l.read).length;
}

export function markRead(s: RoutesState): void {
  // Letters waiting for an answer stay unread until you write back.
  for (const l of s.letters) if (!(l.kind === 'first' && s.routes[l.route]?.status === 'waiting')) l.read = true;
}

export function validateLetters(data: LettersData, regionIds: Set<string>): string[] {
  const errors: string[] = [];
  const ids = new Set(data.routes.map((r) => r.id));
  for (const r of data.routes) if (r.id !== CHEMIST && !regionIds.has(r.id)) errors.push(`route "${r.id}": not a region or the chemist`);
  for (const id of regionIds) if (!ids.has(id)) errors.push(`region "${id}": no grower writes from it`);
  if (!ids.has(CHEMIST)) errors.push('no letter from the chemist');
  const seen = new Set<string>();
  data.chapters.forEach((c, i) => {
    for (const id of c.letters) {
      if (!ids.has(id)) errors.push(`chapter ${i + 1}: unknown route "${id}"`);
      if (seen.has(id)) errors.push(`chapter ${i + 1}: "${id}" already writes in an earlier chapter`);
      seen.add(id);
    }
  });
  for (const id of ids) if (!seen.has(id)) errors.push(`route "${id}": never writes in any chapter`);
  return errors;
}
