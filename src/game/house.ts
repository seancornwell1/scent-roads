import houseJson from '../data/house.json';
import { recognizeAccords } from './accords';
import { effective, needs, overdosed, written, type Entry } from './blend';
import { clients, type Target } from './clients';
import { content, materialsById } from './content';
import { drydown } from './evaporation';
import { seededRandom } from './random';
import { blendImpact, longevityOf, scorePerfume, stageFamilies } from './scoring';
import { consume, sourcing, stockOf, stockQuality, type SourcingState } from './sourcing';

// House perfumes: your own formulas, named and labelled, sold from the shop's shelves.
// Each is rated on how good a perfume it is (not on matching anyone's brief), and sells a
// few bottles a game day depending on its rating, its price and how appealing the shop is.
// Sales are worked out per game day from timestamps, so they happen while the app is closed,
// and each finished day leaves a sales report.

export type MetricId = 'structure' | 'balance' | 'longevity' | 'projection' | 'richness' | 'originality' | 'quality';

export interface HouseData {
  unlock: { reputation: number; materialsInStock: number; gramsEach: number };
  slots: { byRank: Record<string, number>; about: string };
  bottleOptions: number[];
  rating: {
    weights: Record<MetricId, number>;
    idealLongevityHours: number;
    /** Doublings (or halvings) of strength away from typical at which the strength score reaches 0. */
    projectionSpan: number;
    /** Materials (each at least 3% of the oil) for full richness. */
    richnessMaterials: number;
    /** Totals for 2, 3, 4 and 5 stars. */
    stars: number[];
    metrics: Record<MetricId, { name: string; about: string; good: string; fair: string; poor: string }>;
  };
  pricing: { min: number; max: number; power: number; tiers: { id: string; name: string; factor: number }[] };
  sales: { perDayByStars: number[]; priceElasticity: number; reportsKept: number; maxDaysSettled: number };
  names: { patterns: string[]; times: string[]; adjectives: Record<string, string[]>; nouns: Record<string, string[]> };
  labels: { id: string; name: string; image: string | null }[];
  customLabels: { max: number; sizePx: number; jpegQuality: number };
  comments: { best: string[]; slow: string[]; soldOut: string };
}

export const house = houseJson as HouseData;

export const METRICS: MetricId[] = ['structure', 'balance', 'longevity', 'projection', 'richness', 'originality', 'quality'];

export interface HouseRating {
  scores: Record<MetricId, number>;
  /** 0–1. */
  total: number;
  /** 1–5. */
  stars: number;
}

/** A generic label from the set, or one you uploaded. */
export type HouseLabel = { generic: string } | { custom: string };

export interface HousePerfume {
  id: string;
  name: string;
  /** The saved formula it was made from, if it still exists. */
  formulaId?: string;
  entries: Entry[];
  label: HouseLabel;
  rating: HouseRating;
  /** Coins per bottle, and the tier it was set at. */
  price: number;
  tier: string;
  bottles: number;
  sold: number;
  coins: number;
  /** Game hours when it went on the shelf. */
  listedAt: number;
}

export interface DayReport {
  /** Game day number (game hours / 24). */
  day: number;
  lines: { id: string; name: string; sold: number; coins: number; left: number }[];
  coins: number;
  comment: string;
}

export interface HouseState {
  perfumes: HousePerfume[];
  nextId: number;
  /** The last game day whose sales are settled. */
  lastDay: number;
  reports: DayReport[];
  /** Reports not yet seen. */
  unseen: number;
  /** Labels you uploaded: small JPEG data URLs. */
  labels: { id: string; image: string }[];
  /** Game hours when house perfumes were unlocked. */
  unlockedAt?: number;
}

export function newHouseState(gameHours: number): HouseState {
  return { perfumes: [], nextId: 1, lastDay: Math.floor(gameHours / 24) - 1, reports: [], unseen: 0, labels: [] };
}

// Unlocking and room on the shelves

/** Materials you hold enough of to freestyle with (neat or diluted). */
export function materialsInStock(stock: SourcingState, data: HouseData = house): number {
  const ids = new Set(stock.inventory.map((l) => l.material));
  return [...ids].filter((id) => stockOf(stock, id, 100) + stockOf(stock, id, 10) + stockOf(stock, id, 1) >= data.unlock.gramsEach).length;
}

/** What still stands between you and house perfumes (empty once you can make them). */
export function unlockBlockers(reputation: number, stock: SourcingState, data: HouseData = house): string[] {
  const out: string[] = [];
  if (reputation < data.unlock.reputation) out.push(`Reach reputation ${data.unlock.reputation} (you have ${reputation}).`);
  const have = materialsInStock(stock, data);
  if (have < data.unlock.materialsInStock) out.push(`Stock ${data.unlock.materialsInStock} different materials, at least ${data.unlock.gramsEach} g each, to compose freely (you have ${have}).`);
  return out;
}

/** House perfumes you can have on sale at once: your rank's places, plus one per display piece placed. */
export function houseSlots(rankId: string, displayPieces: number, data: HouseData = house): number {
  return (data.slots.byRank[rankId] ?? 1) + displayPieces;
}

// The rating

const clamp = (v: number) => Math.min(1, Math.max(0, v));

let referenceCache: number | null = null;
/** A typical perfume's strength: the median of every brief's target, as the town knows them. */
function referenceImpact(known: Target[]): number {
  if (referenceCache !== null) return referenceCache;
  const values = known.map((t) => blendImpact(entriesOfTarget(t), materialsById, content.model)).sort((a, b) => a - b);
  referenceCache = values[Math.floor(values.length / 2)] || 1;
  return referenceCache;
}

function entriesOfTarget(t: Target): Entry[] {
  return Object.entries(t.formula).map(([material, parts]) => ({ material, parts, dilution: t.dilutions?.[material] ?? 100 }));
}

/**
 * How good a perfume this is, 0–1 on each measure:
 * - structure: top, heart and base each at least 5% of the oil, and a recognisable accord;
 * - balance: no material over half of any stage, and nothing harsh;
 * - longevity: hours on skin against a working day (`idealLongevityHours`);
 * - projection (strength): how loud it is against a typical brief's perfume;
 * - richness: materials at 3% or more, up to `richnessMaterials`;
 * - originality: unlike every perfume the town knows (briefs, her pages, the accord lessons);
 * - quality: of the stock it's made from (1 = good; a preview assumes good stock).
 */
export function rateHouse(blend: Entry[], known: Target[], quality = 1, data: HouseData = house): HouseRating {
  const r = data.rating;
  const eff = effective(blend);
  const total = Object.values(eff).reduce((a, b) => a + b, 0) || 1;
  const share = (id: string) => eff[id] / total;

  const layers = new Set(Object.keys(eff).filter((id) => share(id) >= 0.05).map((id) => materialsById.get(id)?.layer));
  const accords = recognizeAccords(written(blend), content.accords, materialsById).length;
  const structure = 0.7 * (layers.size / 3) + 0.3 * Math.min(1, accords);

  const stages = drydown(eff, materialsById, content.model);
  const dominance = stages.reduce((a, s) => a + clamp((Math.max(0, ...s.shares.map((x) => x.share)) / 100 - 0.5) / 0.5), 0) / (stages.length || 1);
  const harsh = overdosed(blend, materialsById, content.model).length;
  const balance = clamp(1 - dominance - 0.25 * harsh);

  const longevity = clamp(longevityOf(eff, materialsById, content.model, clients.scoring) / r.idealLongevityHours);

  const ratio = blendImpact(blend, materialsById, content.model) / referenceImpact(known);
  const projection = ratio > 0 ? clamp(1 - Math.abs(Math.log2(ratio)) / r.projectionSpan) : 0;

  const counted = Object.keys(eff).filter((id) => share(id) >= 0.03).length;
  const richness = clamp((counted - 1) / (r.richnessMaterials - 1));

  const likeness = known.reduce((max, t) => {
    const s = scorePerfume(blend, t, materialsById, content.model, clients.scoring);
    return Math.max(max, s.stages.reduce((a, x) => a + x.score, 0) / (s.stages.length || 1));
  }, 0);
  const originality = clamp((1 - likeness) / 0.4);

  const q = clamp((quality - 0.55) / (1 - 0.55));
  const scores: Record<MetricId, number> = { structure, balance, longevity, projection, richness, originality, quality: q };
  const sum = METRICS.reduce((a, m) => a + r.weights[m] * scores[m], 0);
  const weight = METRICS.reduce((a, m) => a + r.weights[m], 0);
  const t = sum / weight;
  return { scores, total: t, stars: 1 + r.stars.filter((x) => t >= x).length };
}

/** A word on each measure, from the metric's good / fair / poor lines. */
export function ratingWords(r: HouseRating, data: HouseData = house): { id: MetricId; name: string; text: string; score: number }[] {
  return METRICS.map((id) => {
    const m = data.rating.metrics[id];
    const v = r.scores[id];
    return { id, name: m.name, text: v >= 0.75 ? m.good : v >= 0.45 ? m.fair : m.poor, score: v };
  });
}

// Prices

/** What a bottle is worth at a fair price: better perfumes, and a more appealing shop, ask more. */
export function fairPrice(rating: HouseRating, payMultiplier: number, data: HouseData = house): number {
  const p = data.pricing;
  return Math.round((p.min + (p.max - p.min) * rating.total ** p.power) * payMultiplier);
}

export function priceAt(fair: number, tier: string, data: HouseData = house): number {
  const t = data.pricing.tiers.find((x) => x.id === tier) ?? data.pricing.tiers[1];
  return Math.max(1, Math.round(fair * t.factor));
}

/** What the materials in one bottle cost at the supplier's prices, in coins. */
export function bottleCost(blend: Entry[]): number {
  const sup = sourcing.supplier;
  const grams = blend.reduce((a, e) => a + e.parts, 0) || 1;
  // Neat grams of each material in a bottle: a diluted material counts for its share of neat oil.
  return Object.entries(effective(blend)).reduce((sum, [id, p]) => sum + ((p / grams) * sourcing.perfumeGrams * (sup.prices[id] ?? 0)) / sup.lotGrams, 0);
}

// Names

/** The family that leads at a stage of the drydown ('opening', 'heart' or 'drydown' by index). */
function leading(blend: Entry[], stage: number): string | null {
  const stages = drydown(effective(blend), materialsById, content.model);
  const s = stages[Math.min(stage, stages.length - 1)];
  if (!s) return null;
  const fam = Object.entries(stageFamilies(s.shares, materialsById)).sort((a, b) => b[1] - a[1]);
  return fam[0]?.[0] ?? null;
}

/** A name from the scent profile: the opening's character, and what it dries down to. */
export function suggestName(blend: Entry[], seed: number, data: HouseData = house): string {
  const n = data.names;
  // Mix the blend into the seed, so different perfumes get different names for the same seed.
  const mix = blend.reduce((h, e) => (Math.imul(h ^ (e.material.length * 131 + Math.round(e.parts * 10)), 2654435761) + e.material.charCodeAt(0)) >>> 0, seed * 7919 + 17);
  const rnd = seededRandom(mix);
  const pick = <T>(list: T[]) => list[Math.floor(rnd() * list.length)];
  const top = leading(blend, 0) ?? 'citrus';
  const heart = leading(blend, 1) ?? top;
  const base = leading(blend, 2) ?? heart;
  const adj = pick(n.adjectives[top] ?? n.adjectives.citrus);
  const noun = pick(n.nouns[base] ?? n.nouns.amber);
  const others = (n.nouns[heart] ?? []).filter((x) => x !== noun);
  const noun2 = others.length ? pick(others) : pick(n.nouns.floral.filter((x) => x !== noun));
  return pick(n.patterns)
    .replace('{Adj}', adj)
    .replace('{Noun2}', noun2)
    .replace('{Noun}', noun)
    .replace('{Time}', pick(n.times));
}

// The shelves

/** How many bottles the stock on hand would make. */
export function bottlesPossible(stock: SourcingState, entries: Entry[]): number {
  const per = needs(entries, sourcing.perfumeGrams).filter((e) => e.parts > 0);
  if (per.length === 0) return 0;
  return Math.floor(Math.min(...per.map((e) => stockOf(stock, e.material, e.dilution) / e.parts)) + 1e-9);
}

/** The average quality of the stock a perfume would be made from (1 if there's none yet). */
export function stockQualityFor(stock: SourcingState, entries: Entry[], now: number): number {
  let sum = 0;
  let weight = 0;
  for (const e of entries) {
    if (stockOf(stock, e.material, e.dilution) <= 0) continue;
    sum += e.parts * stockQuality(stock, e.material, now, e.dilution);
    weight += e.parts;
  }
  return weight > 0 ? sum / weight : 1;
}

/** Makes bottles from stock (1 g each). Returns how many were made and their average quality. */
export function makeBottles(stock: SourcingState, entries: Entry[], count: number, now: number): { made: number; quality: number } {
  let made = 0;
  let quality = 0;
  for (; made < count; made++) {
    const q = consume(stock, entries, now);
    if (q === null) break;
    quality += q;
  }
  return { made, quality: made > 0 ? quality / made : 1 };
}

export interface NewHouse {
  name: string;
  formulaId?: string;
  entries: Entry[];
  label: HouseLabel;
  tier: string;
  bottles: number;
}

/** Puts a new house perfume on the shelf. Returns why not, or the perfume. */
export function addHousePerfume(
  h: HouseState,
  stock: SourcingState,
  p: NewHouse,
  slots: number,
  known: Target[],
  payMultiplier: number,
  now: number,
): string | HousePerfume {
  if (h.perfumes.length >= slots) return 'Every place on the shelves is taken: take one down, or place a display shelf.';
  const { made, quality } = makeBottles(stock, p.entries, p.bottles, now);
  if (made === 0) return 'Not enough materials in stock to make a bottle.';
  const rating = rateHouse(p.entries, known, quality);
  const perfume: HousePerfume = {
    id: `h${h.nextId++}`,
    name: p.name.trim() || 'House perfume',
    formulaId: p.formulaId,
    entries: p.entries,
    label: p.label,
    rating,
    price: priceAt(fairPrice(rating, payMultiplier), p.tier),
    tier: p.tier,
    bottles: made,
    sold: 0,
    coins: 0,
    listedAt: now,
  };
  h.perfumes.push(perfume);
  return perfume;
}

/** More bottles of a house perfume already on the shelf. Returns how many were made. */
export function restock(h: HouseState, stock: SourcingState, id: string, count: number, now: number): number {
  const p = h.perfumes.find((x) => x.id === id);
  if (!p) return 0;
  const { made } = makeBottles(stock, p.entries, count, now);
  p.bottles += made;
  return made;
}

export function takeDown(h: HouseState, id: string): void {
  h.perfumes = h.perfumes.filter((p) => p.id !== id);
}

/** Changes a perfume's price tier, from its fair price. */
export function setTier(h: HouseState, id: string, tier: string, payMultiplier: number): void {
  const p = h.perfumes.find((x) => x.id === id);
  if (!p) return;
  p.tier = tier;
  p.price = priceAt(fairPrice(p.rating, payMultiplier), tier);
}

// Sales

/** Bottles a perfume sells in a whole day on the shelf, on average. */
export function dailyDemand(p: HousePerfume, fair: number, appeal: number, data: HouseData = house): number {
  const base = data.sales.perDayByStars[p.rating.stars - 1] ?? 0;
  const priceFactor = Math.min(2, Math.max(0.15, (fair / p.price) ** data.sales.priceElasticity));
  return base * appeal * priceFactor;
}

function poisson(mean: number, rnd: () => number): number {
  const limit = Math.exp(-mean);
  let k = 0;
  let p = rnd();
  while (p > limit && k < 50) {
    k++;
    p *= rnd();
  }
  return k;
}

/**
 * Settles every game day that has ended since last time: each perfume sells its bottles
 * (a perfume listed partway through a day sells for that part of it), and each day with
 * something on the shelves leaves a report. `appeal` multiplies demand (a more appealing
 * shop draws more people); `fairOf` gives a perfume's fair price now. Returns the new reports.
 */
export function settleHouse(h: HouseState, gameHours: number, appeal: number, fairOf: (p: HousePerfume) => number, data: HouseData = house): DayReport[] {
  const today = Math.floor(gameHours / 24);
  const out: DayReport[] = [];
  const first = Math.max(h.lastDay + 1, today - data.sales.maxDaysSettled);
  for (let day = first; day < today; day++) {
    const start = day * 24;
    const lines: DayReport['lines'] = [];
    for (const p of h.perfumes) {
      if (p.listedAt >= start + 24) continue;
      const share = Math.min(1, (start + 24 - Math.max(start, p.listedAt)) / 24);
      const rnd = seededRandom(day * 7907 + Number(p.id.replace(/\D/g, '')) * 104729);
      const sold = Math.min(p.bottles, poisson(dailyDemand(p, fairOf(p), appeal, data) * share, rnd));
      p.bottles -= sold;
      p.sold += sold;
      p.coins += sold * p.price;
      lines.push({ id: p.id, name: p.name, sold, coins: sold * p.price, left: p.bottles });
    }
    if (lines.length === 0) continue;
    const coins = lines.reduce((a, l) => a + l.coins, 0);
    const rnd = seededRandom(day * 31 + 7);
    const best = [...lines].sort((a, b) => b.sold - a.sold)[0];
    const comment = best.sold >= 2 ? data.comments.best[Math.floor(rnd() * data.comments.best.length)] : data.comments.slow[Math.floor(rnd() * data.comments.slow.length)];
    out.push({ day, lines, coins, comment });
  }
  h.lastDay = Math.max(h.lastDay, today - 1);
  h.reports.push(...out);
  if (h.reports.length > data.sales.reportsKept) h.reports.splice(0, h.reports.length - data.sales.reportsKept);
  h.unseen += out.length;
  return out;
}

/** A label to show: the generic one's image (if its art exists yet) or your upload. */
export function labelImage(h: HouseState, label: HouseLabel, data: HouseData = house): string | null {
  if ('custom' in label) return h.labels.find((l) => l.id === label.custom)?.image ?? null;
  return data.labels.find((l) => l.id === label.generic)?.image ?? null;
}

export function labelName(label: HouseLabel, data: HouseData = house): string {
  return 'custom' in label ? 'Your own label' : (data.labels.find((l) => l.id === label.generic)?.name ?? 'Plain paper');
}

/** Keeps an uploaded label (newest last), dropping the oldest unused one past the limit. Returns its id. */
export function addCustomLabel(h: HouseState, image: string, data: HouseData = house): string {
  const id = `u${h.nextId++}`;
  h.labels.push({ id, image });
  const used = new Set(h.perfumes.flatMap((p) => ('custom' in p.label ? [p.label.custom] : [])));
  while (h.labels.length > data.customLabels.max) {
    const i = h.labels.findIndex((l) => !used.has(l.id) && l.id !== id);
    if (i < 0) break;
    h.labels.splice(i, 1);
  }
  return id;
}

export function validateHouse(data: HouseData, familyIds: Set<string>): string[] {
  const errors: string[] = [];
  for (const f of familyIds) {
    if (!data.names.adjectives[f]?.length) errors.push(`house names: no adjectives for family "${f}"`);
    if (!data.names.nouns[f]?.length) errors.push(`house names: no nouns for family "${f}"`);
  }
  if (data.rating.stars.length !== 4) errors.push('house rating: stars needs four thresholds (2–5 stars)');
  if (data.sales.perDayByStars.length !== 5) errors.push('house sales: perDayByStars needs five entries');
  for (const m of METRICS) if (!data.rating.metrics[m] || data.rating.weights[m] === undefined) errors.push(`house rating: metric "${m}" needs words and a weight`);
  if (!data.pricing.tiers.some((t) => t.id === 'fair')) errors.push('house pricing: needs a "fair" tier');
  return errors;
}
