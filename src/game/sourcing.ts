import processesJson from '../data/processes.json';
import regionsJson from '../data/regions.json';
import sourcingJson from '../data/sourcing.json';
import { dateAt } from './clock';
import type { Formula } from './types';

// The idle side: harvest contracts that ripen on game time, processing, shipping,
// crates in the back room, and an inventory whose resins and roots improve with age.
// All times are game hours from the game clock (src/game/clock.ts).

export interface Crop {
  material: string;
  months: number[];
  growGameHours: number;
  bestWindowGameHours: number;
  spoilGameHours: number;
  grams: number;
  cost: number;
  methods: string[];
  verified: boolean;
  check: string[];
}

export interface Region {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  quirk: string;
  /** Coins and reputation to open the region (both 0 for the starting regions). */
  unlock: { coins: number; reputation: number };
  crops: Crop[];
}

export interface Process {
  id: string;
  name: string;
  output: string;
  about: string;
  gameHours: number;
  yield: number;
  quality: number;
  cost: number;
  /** Coins and reputation to buy the method, or null if you start with it. */
  unlock: { coins: number; reputation: number } | null;
  upgrades: { name: string; coins: number; reputation: number; quality: number; speed: number }[];
  verified: boolean;
  check: string[];
}

export interface SourcingData {
  startingCoins: number;
  calendarStart: { month: number; day: number };
  shop: { lat: number; lon: number; note: string };
  shipping: { baseGameHours: number; kmPerGameHour: number };
  quality: { inWindow: number; spoiled: number; words: { min: number; text: string }[]; scoreEffect: number };
  aging: Record<string, { perGameDay: number; max: number }>;
  supplier: { name: string; shippingGameHours: number; lotGrams: number; brokerQuality: number; catalogueQuality: number; prices: Record<string, number> };
  perfumeGrams: number;
}

export const regions = regionsJson as Region[];
export const processes = processesJson as Process[];
export const sourcing = sourcingJson as SourcingData;

export interface Item {
  material: string;
  grams: number;
  quality: number;
}

export interface Lot extends Item {
  id: string;
  /** When it went into stock, for aging. */
  since: number;
}

export interface Contract {
  id: string;
  region: string;
  material: string;
  signedAt: number;
  ripeAt: number;
  bestUntil: number;
  spoiledAt: number;
  /** Bumper crops yield more (from the newspaper's events). */
  yieldMultiplier?: number;
}

export interface Batch extends Item {
  id: string;
  region: string;
  method: string;
  readyAt: number;
}

export interface Shipment {
  id: string;
  from: string;
  items: Item[];
  arrivesAt: number;
}

export interface Crate {
  id: string;
  from: string;
  items: Item[];
  arrivedAt: number;
}

export interface SourcingState {
  contracts: Contract[];
  batches: Batch[];
  shipments: Shipment[];
  crates: Crate[];
  inventory: Lot[];
  nextId: number;
}

export function newSourcingState(): SourcingState {
  return { contracts: [], batches: [], shipments: [], crates: [], inventory: [], nextId: 1 };
}

const id = (s: SourcingState, prefix: string) => `${prefix}${s.nextId++}`;

export function regionById(regionId: string, data: Region[] = regions): Region | undefined {
  return data.find((r) => r.id === regionId);
}

export function cropOf(regionId: string, material: string, data: Region[] = regions): Crop | undefined {
  return regionById(regionId, data)?.crops.find((c) => c.material === material);
}

export function monthAt(gameHours: number, data: SourcingData = sourcing): number {
  return dateAt(gameHours, data.calendarStart).month;
}

export function inSeason(crop: Crop, gameHours: number, data: SourcingData = sourcing): boolean {
  return crop.months.includes(monthAt(gameHours, data));
}

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function shippingGameHours(region: Region, data: SourcingData = sourcing): number {
  return Math.round(data.shipping.baseGameHours + distanceKm(region, data.shop) / data.shipping.kmPerGameHour);
}

export type ContractStage = 'growing' | 'best' | 'late' | 'spoiled';

export function contractStage(c: Contract, now: number): ContractStage {
  if (now < c.ripeAt) return 'growing';
  if (now <= c.bestUntil) return 'best';
  if (now < c.spoiledAt) return 'late';
  return 'spoiled';
}

/** Quality of the crop if harvested now: full inside the best window, falling after it. */
export function harvestQuality(c: Contract, now: number, data: SourcingData = sourcing): number {
  const q = data.quality;
  if (now <= c.bestUntil) return q.inWindow;
  if (now >= c.spoiledAt) return q.spoiled;
  const t = (now - c.bestUntil) / (c.spoiledAt - c.bestUntil);
  return q.inWindow + (q.spoiled - q.inWindow) * t;
}

export interface Wallet {
  money: number;
}

/** Signs a harvest contract. Returns null on success, or why it can't be signed. */
export function signContract(
  s: SourcingState,
  wallet: Wallet,
  regionId: string,
  material: string,
  now: number,
  unlocked: Set<string>,
  options: { regionOpen?: boolean; yieldMultiplier?: number } = {},
): string | null {
  const crop = cropOf(regionId, material);
  if (!crop) return 'No such crop.';
  if (options.regionOpen === false) return 'Open this region first.';
  if (!unlocked.has(material)) return 'Not unlocked yet.';
  if (!inSeason(crop, now)) return 'Out of season.';
  if (s.contracts.some((c) => c.region === regionId && c.material === material)) return 'Already growing.';
  if (wallet.money < crop.cost) return 'Not enough coins.';
  wallet.money -= crop.cost;
  const ripeAt = now + crop.growGameHours;
  s.contracts.push({
    id: id(s, 'c'),
    region: regionId,
    material,
    signedAt: now,
    ripeAt,
    bestUntil: ripeAt + crop.bestWindowGameHours,
    spoiledAt: ripeAt + crop.spoilGameHours,
    yieldMultiplier: options.yieldMultiplier ?? 1,
  });
  return null;
}

/**
 * Harvests a ripe contract and starts processing it. `stats` is the method as you own it
 * (see processStats in upgrades.ts). Returns null on success, or why not.
 */
export function harvest(
  s: SourcingState,
  wallet: Wallet,
  contractId: string,
  methodId: string,
  now: number,
  stats: { owned: boolean; quality: number; gameHours: number },
): string | null {
  const c = s.contracts.find((x) => x.id === contractId);
  const crop = c && cropOf(c.region, c.material);
  const method = processes.find((p) => p.id === methodId);
  if (!c || !crop || !method) return 'Unknown harvest or method.';
  if (now < c.ripeAt) return 'Not ripe yet.';
  if (!crop.methods.includes(methodId)) return `${method.name} doesn't suit this crop.`;
  if (!stats.owned) return `Buy ${method.name} first, under Shop → Processing.`;
  if (wallet.money < method.cost) return 'Not enough coins.';
  wallet.money -= method.cost;
  const quality = Math.round(harvestQuality(c, now) * stats.quality * 100) / 100;
  const grams = Math.round(crop.grams * method.yield * (c.yieldMultiplier ?? 1));
  s.batches.push({ id: id(s, 'b'), region: c.region, method: methodId, material: c.material, grams, quality, readyAt: now + stats.gameHours });
  s.contracts = s.contracts.filter((x) => x.id !== contractId);
  return null;
}

/** Orders a lot from the supplier: naturals from the broker, synthetics from the catalogue. */
export function order(
  s: SourcingState,
  wallet: Wallet,
  material: string,
  natural: boolean,
  now: number,
  unlocked: Set<string>,
  priceMultiplier = 1,
  data: SourcingData = sourcing,
): string | null {
  if (data.supplier.prices[material] === undefined) return 'Not sold.';
  const price = priceOf(material, priceMultiplier, data);
  if (!unlocked.has(material)) return 'Not unlocked yet.';
  if (wallet.money < price) return 'Not enough coins.';
  wallet.money -= price;
  const quality = natural ? data.supplier.brokerQuality : data.supplier.catalogueQuality;
  s.shipments.push({ id: id(s, 's'), from: data.supplier.name, items: [{ material, grams: data.supplier.lotGrams, quality }], arrivesAt: now + data.supplier.shippingGameHours });
  return null;
}

export function priceOf(material: string, multiplier = 1, data: SourcingData = sourcing): number {
  return Math.max(1, Math.round(data.supplier.prices[material] * multiplier));
}

/**
 * Moves things along: finished processing ships out, and arrived shipments become crates.
 * `delay` adds game hours to a region's shipping (storms). Returns new crates.
 */
export function tickSourcing(s: SourcingState, now: number, delay: (regionId: string, at: number) => number = () => 0, data: SourcingData = sourcing): Crate[] {
  for (const b of s.batches.filter((x) => x.readyAt <= now)) {
    const region = regionById(b.region)!;
    const arrivesAt = b.readyAt + shippingGameHours(region, data) + delay(region.id, b.readyAt);
    s.shipments.push({ id: id(s, 's'), from: region.name, items: [{ material: b.material, grams: b.grams, quality: b.quality }], arrivesAt });
  }
  s.batches = s.batches.filter((x) => x.readyAt > now);
  const arrived = s.shipments.filter((x) => x.arrivesAt <= now);
  const crates = arrived.map((x) => ({ id: id(s, 'k'), from: x.from, items: x.items, arrivedAt: x.arrivesAt }));
  s.crates.push(...crates);
  s.shipments = s.shipments.filter((x) => x.arrivesAt > now);
  return crates;
}

export function unpack(s: SourcingState, crateId: string, now: number): Item[] {
  const crate = s.crates.find((c) => c.id === crateId);
  if (!crate) return [];
  for (const item of crate.items) s.inventory.push({ ...item, id: id(s, 'l'), since: now });
  s.crates = s.crates.filter((c) => c.id !== crateId);
  return crate.items;
}

/** A lot's quality now, including what it has gained from aging. */
export function lotQuality(lot: Lot, now: number, data: SourcingData = sourcing): number {
  const aging = data.aging[lot.material];
  if (!aging) return lot.quality;
  const days = Math.max(0, now - lot.since) / 24;
  return lot.quality + Math.min(aging.max, aging.perGameDay * days);
}

export function stockOf(s: SourcingState, material: string): number {
  return s.inventory.filter((l) => l.material === material).reduce((sum, l) => sum + l.grams, 0);
}

/** Average quality of a material in stock, weighted by grams (0 if none). */
export function stockQuality(s: SourcingState, material: string, now: number): number {
  const lots = s.inventory.filter((l) => l.material === material);
  const grams = lots.reduce((sum, l) => sum + l.grams, 0);
  return grams > 0 ? lots.reduce((sum, l) => sum + l.grams * lotQuality(l, now), 0) / grams : 0;
}

/** Grams of each material a perfume of this formula needs. */
export function gramsNeeded(formula: Formula, data: SourcingData = sourcing): Record<string, number> {
  const total = Object.values(formula).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(formula).map(([m, parts]) => [m, total > 0 ? (parts / total) * data.perfumeGrams : 0]));
}

export function missingFor(s: SourcingState, formula: Formula, data: SourcingData = sourcing): string[] {
  return Object.entries(gramsNeeded(formula, data))
    .filter(([m, g]) => stockOf(s, m) + 1e-9 < g)
    .map(([m]) => m);
}

/** Uses up the materials for one perfume, oldest lots first. Returns their average quality, or null if short. */
export function consume(s: SourcingState, formula: Formula, now: number, data: SourcingData = sourcing): number | null {
  if (missingFor(s, formula, data).length > 0) return null;
  let qualitySum = 0;
  let gramsSum = 0;
  for (const [material, needed] of Object.entries(gramsNeeded(formula, data))) {
    let left = needed;
    for (const lot of s.inventory.filter((l) => l.material === material).sort((a, b) => a.since - b.since)) {
      if (left <= 0) break;
      const take = Math.min(lot.grams, left);
      qualitySum += take * lotQuality(lot, now, data);
      gramsSum += take;
      lot.grams = Math.round((lot.grams - take) * 1000) / 1000;
      left -= take;
    }
  }
  s.inventory = s.inventory.filter((l) => l.grams > 0.0005);
  return gramsSum > 0 ? qualitySum / gramsSum : 1;
}

export function qualityWord(q: number, data: SourcingData = sourcing): string {
  return data.quality.words.find((w) => q >= w.min)?.text ?? '';
}

export function validateSourcing(materialIds: Set<string>, naturalIds: Set<string>, data: SourcingData = sourcing): string[] {
  const errors: string[] = [];
  const grown = new Set<string>();
  const processIds = new Set(processes.map((p) => p.id));
  for (const r of regions) {
    for (const c of r.crops) {
      if (!materialIds.has(c.material)) errors.push(`region "${r.id}": unknown material "${c.material}"`);
      grown.add(c.material);
      if (c.months.some((m) => m < 1 || m > 12)) errors.push(`region "${r.id}": bad month for ${c.material}`);
      for (const m of c.methods) if (!processIds.has(m)) errors.push(`region "${r.id}": unknown method "${m}"`);
      if (c.verified !== (c.check.length === 0)) errors.push(`region "${r.id}": ${c.material} verified must match check`);
    }
  }
  for (const id of naturalIds) if (!grown.has(id)) errors.push(`natural "${id}" grows in no region`);
  for (const id of materialIds) if (data.supplier.prices[id] === undefined) errors.push(`supplier: no price for "${id}"`);
  return errors;
}
