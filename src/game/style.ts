import { effective, type Entry } from './blend';
import { clients, type Regular } from './clients';
import { drydown } from './evaporation';
import { overlap, stageFamilies } from './scoring';
import type { Material, Model } from './types';

// The shop's style: the families of the perfumes you've handed over lately. A shop that
// leans floral draws wedding requests; one that leans woody and smoky draws other regulars.
// Briefs are weighted by how close their own target is to your style.

export interface StyleConfig {
  /** How many recent perfumes make up the style. */
  historySize: number;
  /** How strongly the style tips which walk-in briefs come up (0 = not at all). */
  weight: number;
}

/** A perfume's families at the heart of its drydown (about an hour in), shares 0–1. */
export function blendProfile(blend: Entry[], materials: Map<string, Material>, model: Model): Record<string, number> {
  const stages = drydown(effective(blend), materials, model);
  const heart = stages[Math.min(1, stages.length - 1)];
  return heart ? stageFamilies(heart.shares, materials) : {};
}

/** Adds a handed-over perfume to the style history, keeping the most recent. */
export function recordStyle(history: Record<string, number>[], profile: Record<string, number>, config: StyleConfig = clients.style): void {
  history.push(profile);
  while (history.length > config.historySize) history.shift();
}

/** The shop's style: the average family shares of recent perfumes (empty for a new shop). */
export function shopStyle(history: Record<string, number>[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const h of history) for (const [f, v] of Object.entries(h)) out[f] = (out[f] ?? 0) + v / history.length;
  return out;
}

/** How likely a brief is to come up in a shop of this style (1 = no pull either way). */
export function briefWeight(lean: Record<string, number>, style: Record<string, number>, config: StyleConfig = clients.style): number {
  return 1 + config.weight * overlap(style, lean);
}

/** Whether a regular comes in at all: some only visit a shop that leans their way. */
export function regularWelcome(r: Regular, style: Record<string, number>): boolean {
  if (!r.comesWhen) return true;
  return r.comesWhen.families.reduce((sum, f) => sum + (style[f] ?? 0), 0) >= r.comesWhen.min;
}
