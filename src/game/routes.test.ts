import { describe, expect, it } from 'vitest';
import { CHEMIST, answer, chapterAt, chapterInfo, crateLetter, inTransit, letters, markRead, newRoutesState, routeOpen, routesTick, unreadLetters, validateLetters } from './routes';
import { newSourcingState, order, regions, sourcing } from './sourcing';

const start = sourcing.calendarStart;
const DAY = 24;
/** Game hours from 1 March to the 1st of a month in year 1 (the game's calendar starts on 1 March). */
const monthStart = (month: number) => [31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31, 28].slice(0, (month + 12 - 3) % 12).reduce((a, b) => a + b, 0) * DAY;

describe('letters data', () => {
  it('is valid: every region has a grower, and everyone writes in exactly one chapter', () => {
    expect(validateLetters(letters, new Set(regions.map((r) => r.id)))).toEqual([]);
  });
});

describe('chapters', () => {
  it('follow the seasons, starting in spring', () => {
    expect(chapterAt(0, start)).toBe(0);
    expect(chapterAt(monthStart(5) + 20 * DAY, start)).toBe(0);
    expect(chapterAt(monthStart(6), start)).toBe(1);
    expect(chapterAt(monthStart(12), start)).toBe(3);
    expect(chapterAt(monthStart(2), start)).toBe(3); // February is still winter
    expect(chapterAt(365 * DAY, start)).toBe(4);
    expect(chapterInfo(1, start).season).toBe('Summer');
    expect(chapterInfo(40, start).title).toMatch(/year 11/);
  });
});

describe('routes', () => {
  it('start closed; the first chapter brings letters from her nearest growers and the chemist', () => {
    const s = newRoutesState();
    expect(routesTick(s, 0, start).chapter).toBe(0);
    expect(Object.keys(s.routes).sort()).toEqual([...letters.chapters[0].letters].sort());
    expect(routeOpen(s, 'calabria')).toBe(false);
    expect(unreadLetters(s)).toBe(letters.chapters[0].letters.length);
    expect(routesTick(s, 1, start).chapter).toBeNull();
  });

  it('open one at a time: you choose whose letter to answer, and the route opens when they write back', () => {
    const s = newRoutesState();
    routesTick(s, 0, start);
    expect(answer(s, 'provence', 10)).toBeNull();
    expect(inTransit(s)).toBe('provence');
    expect(answer(s, 'calabria', 11)).toMatch(/one letter at a time/);
    expect(answer(s, 'grasse', 11)).toMatch(/no letter/);

    expect(routesTick(s, 10 + letters.replyGameHours - 0.1, start).opened).toEqual([]);
    expect(routesTick(s, 10 + letters.replyGameHours, start).opened).toEqual(['provence']);
    expect(routeOpen(s, 'provence')).toBe(true);
    expect(s.letters.at(-1)?.kind).toBe('reply');
    expect(answer(s, 'calabria', 30)).toBeNull();
  });

  it('later chapters bring more letters, even if you were away for several seasons', () => {
    const s = newRoutesState();
    routesTick(s, 0, start);
    expect(routesTick(s, monthStart(12), start).chapter).toBe(3);
    for (const c of letters.chapters.slice(0, 4)) for (const id of c.letters) expect(s.routes[id]?.status).toBe('waiting');
  });

  it('crates carry a note, taking turns through the grower’s notes', () => {
    const s = newRoutesState();
    const first = crateLetter(s, 'calabria', 0, { material: 'Bergamot', quality: 'fine' })!;
    expect(first.body[0]).toContain('Bergamot');
    expect(first.body[0]).not.toMatch(/\{|\}/);
    const second = crateLetter(s, 'calabria', 0, { material: 'Bergamot', quality: 'fine' })!;
    expect(second.body).not.toEqual(first.body);
  });

  it('marks letters read, except ones still waiting for an answer', () => {
    const s = newRoutesState();
    routesTick(s, 0, start);
    crateLetter(s, 'calabria', 0, { material: 'Bergamot', quality: 'fine' });
    markRead(s);
    expect(unreadLetters(s)).toBe(letters.chapters[0].letters.length);
  });
});

describe('ordering', () => {
  const owned = new Set(['vanillin', 'bergamot']);
  it('needs the chemist for aroma chemicals, but the apothecary sells naturals all along', () => {
    const s = newSourcingState();
    expect(order(s, { money: 999 }, 'vanillin', false, 0, owned, 1, false)).toMatch(/Write back/);
    expect(order(s, { money: 999 }, 'bergamot', true, 0, owned, 1, false)).toBeNull();
    expect(order(s, { money: 999 }, 'vanillin', false, 0, owned, 1, true)).toBeNull();
    expect(s.shipments.find((x) => x.items[0].material === 'vanillin')?.route).toBe(CHEMIST);
    expect(s.shipments.find((x) => x.items[0].material === 'bergamot')?.route).toBeUndefined();
  });
});
