import awardsJson from '../data/awards.json';
import { recognizeAccords } from './accords';
import { blendCost, effective, overdosed, written, type Entry } from './blend';
import { dateAt } from './clock';
import type { Target } from './clients';
import { content, materialsById } from './content';
import { drydown } from './evaporation';
import { longevityOf, scorePerfume } from './scoring';
import { clients } from './clients';

// The Town Perfume Awards: once a year, an open brief (just a theme) for any perfume you
// like. Entries open in the last weeks of December and are judged when the year turns, on
// structure, balance, originality and cost. The judges speak in words, like customers.

export interface Prize {
  min: number;
  name: string;
  coins: number;
  reputation: number;
}

export interface AwardsData {
  name: string;
  /** Days before the year's end that entries open. */
  openDays: number;
  themes: string[];
  weights: { structure: number; balance: number; originality: number; cost: number };
  /** Euros per 100 g at which the cost score reaches zero. */
  costScale: number;
  prizes: Prize[];
}

export const awards = awardsJson as AwardsData;

export interface AwardResult {
  name: string;
  scores: { structure: number; balance: number; originality: number; cost: number };
  total: number;
  prize: Prize;
}

export interface AwardsState {
  /** Year → your entry. */
  entries: Record<number, { name: string; entries: Entry[] }>;
  /** Year → the judges' verdict. */
  results: Record<number, AwardResult>;
}

export function newAwardsState(): AwardsState {
  return { entries: {}, results: {} };
}

export function yearAt(gameHours: number, start: { month: number; day: number }): number {
  return dateAt(gameHours, start).year;
}

export function themeOf(year: number, data: AwardsData = awards): string {
  return data.themes[(year - 1) % data.themes.length];
}

/** Whether entries are open: the last `openDays` days of December. */
export function entriesOpen(gameHours: number, start: { month: number; day: number }, data: AwardsData = awards): boolean {
  const d = dateAt(gameHours, start);
  return d.month === 12 && d.day > 31 - data.openDays;
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The judges' scores, 0–1 each.
 * Structure: top, heart and base all present, and a recognisable accord.
 * Balance: no one material drowning a stage, nothing harsh, and it lasts the day.
 * Originality: unlike every brief and lesson they've smelled before, and not too simple.
 * Cost: cheaper is better.
 */
export function judge(blend: Entry[], known: Target[], name: string, data: AwardsData = awards): AwardResult {
  const eff = effective(blend);
  const total = Object.values(eff).reduce((a, b) => a + b, 0) || 1;
  const layers = new Set(Object.entries(eff).filter(([, p]) => p / total >= 0.05).map(([id]) => materialsById.get(id)?.layer));
  const accords = recognizeAccords(written(blend), content.accords, materialsById).length;
  const structure = 0.7 * (layers.size / 3) + 0.3 * Math.min(1, accords);

  const stages = drydown(eff, materialsById, content.model);
  const dominance = stages.reduce((a, s) => a + clamp((Math.max(0, ...s.shares.map((x) => x.share)) / 100 - 0.5) / 0.5), 0) / (stages.length || 1);
  const longevity = longevityOf(eff, materialsById, content.model, clients.scoring);
  const harsh = overdosed(blend, materialsById, content.model).length;
  const balance = clamp(0.6 * (1 - dominance) + 0.4 * Math.min(1, longevity / 8) - 0.2 * harsh);

  const likeness = known.reduce((max, t) => {
    const r = scorePerfume(blend, t, materialsById, content.model, clients.scoring);
    return Math.max(max, r.stages.reduce((a, s) => a + s.score, 0) / (r.stages.length || 1));
  }, 0);
  const originality = clamp(0.7 * (1 - likeness) / 0.5 + 0.3 * Math.min(1, Object.keys(eff).length / 6));

  const cost = clamp(1 - blendCost(blend, materialsById) / data.costScale);
  const w = data.weights;
  const totalScore = w.structure * structure + w.balance * balance + w.originality * clamp(originality) + w.cost * cost;
  const prize = data.prizes.find((p) => totalScore >= p.min) ?? data.prizes[data.prizes.length - 1];
  return { name, scores: { structure, balance, originality: clamp(originality), cost }, total: totalScore, prize };
}

/** What the judges say about each criterion, in words. */
export function judgesWords(r: AwardResult): string[] {
  const s = r.scores;
  const word = (v: number, good: string, fair: string, poor: string) => (v >= 0.75 ? good : v >= 0.45 ? fair : poor);
  return [
    word(s.structure, 'Beautifully built, top to base.', 'Well built, though one layer is thin.', 'It needs a fuller structure: top, heart and base.'),
    word(s.balance, 'Perfectly balanced, and it lasts the day.', 'Mostly balanced, but something takes over for a while.', 'One material drowns the rest, or it fades too soon.'),
    word(s.originality, 'Nothing like anything we have smelled before.', 'It has its own voice, if a familiar one.', 'Lovely, but we have smelled this before.'),
    word(s.cost, 'Remarkably good value.', 'A fair price for what it is.', 'Very costly for a perfume of its kind.'),
  ];
}

/**
 * At the turn of the year, judges last year's entry (if any) and returns the result to
 * announce. `known` are the targets the judges compare against for originality.
 */
export function settleAwards(s: AwardsState, gameHours: number, start: { month: number; day: number }, known: Target[]): { year: number; result: AwardResult } | null {
  const year = yearAt(gameHours, start);
  for (const [y, entry] of Object.entries(s.entries)) {
    const ey = Number(y);
    if (ey >= year || s.results[ey]) continue;
    const result = judge(entry.entries, known, entry.name);
    s.results[ey] = result;
    return { year: ey, result };
  }
  return null;
}
