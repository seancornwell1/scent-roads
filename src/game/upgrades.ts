import furnitureJson from '../data/furniture.json';
import { processes, regions, type Process } from './sourcing';
import type { Wallet } from './sourcing';

// Shop upgrades: furniture you buy and place (which raises the shop's appeal),
// and the regions and processing methods you open up with money and reputation.

export interface FurnitureItem {
  id: string;
  name: string;
  kind: string;
  model: string;
  placement: 'floor' | 'surface';
  price: number;
  appeal: number;
  reputation: number;
  /** Footprint [width, depth] in metres. */
  size: [number, number];
  /** Display cases: how many signature perfumes they hold. */
  capacity?: number;
}

export interface AppealLevel {
  min: number;
  name: string;
  payMultiplier: number;
  strictness: number;
  arrivalMultiplier: number;
}

export interface FurnitureData {
  appeal: { levels: AppealLevel[] };
  kinds: Record<string, string>;
  items: FurnitureItem[];
  display: {
    saleEveryGameHours: number;
    basePrice: number;
    pricePerAccord: number;
    pricePerLongevityHour: number;
    pricePerLayer: number;
    maxPrice: number;
    bottleOptions: number[];
  };
}

export const furniture = furnitureJson as unknown as FurnitureData;

export interface Placement {
  item: string;
  /** An upgrade-spot zone id (floor) or a surface id. */
  spot: string;
}

export interface UpgradeState {
  /** Item id → how many you own (placed or in storage). */
  owned: Record<string, number>;
  placed: Placement[];
  /** Regions opened beyond the free starting ones. */
  regions: string[];
  /** Process id → level: 0 = owned, 1+ = upgraded. Missing = not owned (unless free). */
  processes: Record<string, number>;
}

export function newUpgradeState(): UpgradeState {
  return { owned: {}, placed: [], regions: [], processes: {} };
}

export const itemById = (id: string) => furniture.items.find((i) => i.id === id);

export function appealOf(u: UpgradeState): number {
  return u.placed.reduce((sum, p) => sum + (itemById(p.item)?.appeal ?? 0), 0);
}

export function appealLevel(appeal: number, data: FurnitureData = furniture): AppealLevel {
  return [...data.appeal.levels].reverse().find((l) => appeal >= l.min) ?? data.appeal.levels[0];
}

export function nextAppealLevel(appeal: number, data: FurnitureData = furniture): AppealLevel | null {
  return data.appeal.levels.find((l) => l.min > appeal) ?? null;
}

export function inStorage(u: UpgradeState, itemId: string): number {
  return (u.owned[itemId] ?? 0) - u.placed.filter((p) => p.item === itemId).length;
}

export function buyItem(u: UpgradeState, wallet: Wallet, itemId: string, reputation: number): string | null {
  const item = itemById(itemId);
  if (!item) return 'No such item.';
  if (reputation < item.reputation) return `Unlocks at reputation ${item.reputation}.`;
  if (wallet.money < item.price) return 'Not enough coins.';
  wallet.money -= item.price;
  u.owned[itemId] = (u.owned[itemId] ?? 0) + 1;
  return null;
}

/** Places an item from storage on a spot. `spotKind` says whether the spot is on the floor or a surface. */
export function place(u: UpgradeState, itemId: string, spot: string, spotKind: 'floor' | 'surface'): string | null {
  const item = itemById(itemId);
  if (!item) return 'No such item.';
  if (inStorage(u, itemId) <= 0) return 'None in storage.';
  if (item.placement !== spotKind) return item.placement === 'floor' ? 'That goes on the floor.' : 'That goes on a table or counter.';
  if (u.placed.some((p) => p.spot === spot)) return 'Something is already there.';
  u.placed.push({ item: itemId, spot });
  return null;
}

export function unplace(u: UpgradeState, spot: string): void {
  u.placed = u.placed.filter((p) => p.spot !== spot);
}

export function displayCapacity(u: UpgradeState): number {
  return u.placed.reduce((sum, p) => sum + (itemById(p.item)?.capacity ?? 0), 0);
}

// Regions

export function regionOpen(u: UpgradeState, regionId: string): boolean {
  const region = regions.find((r) => r.id === regionId);
  return !!region && (region.unlock.coins === 0 && region.unlock.reputation === 0 ? true : u.regions.includes(regionId));
}

export function openRegion(u: UpgradeState, wallet: Wallet, regionId: string, reputation: number): string | null {
  const region = regions.find((r) => r.id === regionId);
  if (!region) return 'No such region.';
  if (regionOpen(u, regionId)) return 'Already open.';
  if (reputation < region.unlock.reputation) return `Needs reputation ${region.unlock.reputation}.`;
  if (wallet.money < region.unlock.coins) return 'Not enough coins.';
  wallet.money -= region.unlock.coins;
  u.regions.push(regionId);
  return null;
}

// Processing

export function processLevel(u: UpgradeState, p: Process): number | null {
  if (u.processes[p.id] !== undefined) return u.processes[p.id];
  return p.unlock === null ? 0 : null;
}

/** A method's effective quality and time at its current level, and whether you own it. */
export function processStats(u: UpgradeState, processId: string): { owned: boolean; quality: number; gameHours: number; level: number } {
  const p = processes.find((x) => x.id === processId)!;
  const level = processLevel(u, p);
  const ups = p.upgrades.slice(0, level ?? 0);
  return {
    owned: level !== null,
    level: level ?? 0,
    quality: p.quality + ups.reduce((a, x) => a + x.quality, 0),
    gameHours: Math.round(ups.reduce((h, x) => h * x.speed, p.gameHours)),
  };
}

export function buyProcess(u: UpgradeState, wallet: Wallet, processId: string, reputation: number): string | null {
  const p = processes.find((x) => x.id === processId);
  if (!p) return 'No such method.';
  const level = processLevel(u, p);
  if (level === null) {
    const cost = p.unlock!;
    if (reputation < cost.reputation) return `Needs reputation ${cost.reputation}.`;
    if (wallet.money < cost.coins) return 'Not enough coins.';
    wallet.money -= cost.coins;
    u.processes[p.id] = 0;
    return null;
  }
  const next = p.upgrades[level];
  if (!next) return 'Fully upgraded.';
  if (reputation < next.reputation) return `Needs reputation ${next.reputation}.`;
  if (wallet.money < next.coins) return 'Not enough coins.';
  wallet.money -= next.coins;
  u.processes[p.id] = level + 1;
  return null;
}
