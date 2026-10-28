import timeJson from '../data/time.json';

// Game time runs on real time: 1 real day = 1 game week by default (src/data/time.json).
// For testing, add ?speed=N to the URL to make game time pass N times faster.

export const time = timeJson as { gameDaysPerRealDay: number; seasons: { name: string; months: number[] }[] };

/** Real milliseconds per game hour at normal speed. */
export function realMsPerGameHour(): number {
  return 86_400_000 / (time.gameDaysPerRealDay * 24);
}

let speed = 1;

export function setTimeSpeed(multiplier: number): void {
  speed = multiplier > 0 ? multiplier : 1;
}

/** Real milliseconds that a number of game hours takes. */
export function gameHoursToMs(hours: number): number {
  return (hours * realMsPerGameHour()) / speed;
}

/** Real minutes scaled by the testing speed (for things measured in real time, like arrivals). */
export function realMinutesToMs(minutes: number): number {
  return (minutes * 60_000) / speed;
}
