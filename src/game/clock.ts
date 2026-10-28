import { realMsPerGameHour, time } from './time';

export { realMsPerGameHour };

// The game clock: game hours, derived from real timestamps so time passes while the app
// is closed. A speed multiplier (debug) re-anchors the clock so changing it never jumps.

export interface Clock {
  anchorReal: number;
  anchorGame: number;
  speed: number;
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function newClock(realNow: number): Clock {
  return { anchorReal: realNow, anchorGame: 0, speed: 1 };
}

export function gameNow(clock: Clock, realNow: number): number {
  return clock.anchorGame + ((realNow - clock.anchorReal) * clock.speed) / realMsPerGameHour();
}

export function setClockSpeed(clock: Clock, speed: number, realNow: number): void {
  clock.anchorGame = gameNow(clock, realNow);
  clock.anchorReal = realNow;
  clock.speed = speed > 0 ? speed : 1;
}

/** Real milliseconds until a game time is reached, at the clock's current speed. */
export function realMsUntil(clock: Clock, gameHours: number, realNow: number): number {
  return Math.max(0, ((gameHours - gameNow(clock, realNow)) * realMsPerGameHour()) / clock.speed);
}

export interface GameDate {
  /** 1–12 */
  month: number;
  day: number;
  year: number;
}

/** The calendar date at a game time, counting from a start date (365-day years). */
export function dateAt(gameHours: number, start: { month: number; day: number }): GameDate {
  let dayOfYear = MONTH_DAYS.slice(0, start.month - 1).reduce((a, b) => a + b, 0) + start.day - 1;
  let year = 1;
  dayOfYear += Math.floor(gameHours / 24);
  year += Math.floor(dayOfYear / 365);
  dayOfYear %= 365;
  let month = 0;
  while (dayOfYear >= MONTH_DAYS[month]) dayOfYear -= MONTH_DAYS[month++];
  return { month: month + 1, day: dayOfYear + 1, year };
}

/** The season's name for a month (1–12), from src/data/time.json. */
export function seasonOf(month: number): string {
  return time.seasons.find((s) => s.months.includes(month))?.name ?? '';
}
