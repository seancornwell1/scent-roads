import labJson from '../data/lab.json';
import { effective, entriesOf, type Entry } from './blend';
import type { Brief, Target } from './clients';
import type { Wallet } from './sourcing';

// The analysis lab, inspired by gas chromatography: running a sample separates it and shows
// its main components; better equipment reveals more of them, and finally rough percentages.
// Reconstruction challenges are well-known perfume styles (under invented names) described
// by their public structure: analyse a sample, then rebuild it at the organ.
// (A real chromatograph shows molecules; here a natural shows up as itself, for simplicity.)

export interface LabLevel {
  name: string;
  coins: number;
  reputation: number;
  /** How many of the biggest components a run shows. */
  reveal: number;
  /** Whether it shows rough percentages. */
  percent: boolean;
  about: string;
}

export interface Challenge {
  id: string;
  name: string;
  era: string;
  /** The style's public structure, in words. */
  structure: { top: string; heart: string; base: string };
  about: string;
  /** Reputation it appears at. */
  reputation: number;
  target: Target;
  reward: { coins: number; reputation: number };
}

export interface LabData {
  runCost: number;
  levels: LabLevel[];
  challenges: Challenge[];
}

export const lab = labJson as unknown as LabData;

export interface Component {
  material: string;
  /** Percent of the sample's perfume oil (solvent excluded), if the level shows it. */
  percent?: number;
}

export interface LabState {
  /** Equipment owned: 0 = none, 1 = the first level, … */
  level: number;
  analyses: Record<string, { level: number; components: Component[] }>;
  challenges: Record<string, { best: number; rewarded?: boolean }>;
}

export function newLabState(): LabState {
  return { level: 0, analyses: {}, challenges: {} };
}

export function challengeBrief(c: Challenge): Brief {
  return { id: `challenge-${c.id}`, memory: c.about, hints: [`Top: ${c.structure.top}.`, `Heart: ${c.structure.heart}.`, `Base: ${c.structure.base}.`], target: c.target, pay: 0 };
}

/** Separates a sample: its biggest components first, as many as the equipment shows. */
export function analyse(blend: Entry[], level: LabLevel): Component[] {
  const eff = effective(blend);
  const total = Object.values(eff).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(eff)
    .sort((a, b) => b[1] - a[1])
    .slice(0, level.reveal)
    .map(([material, p]) => (level.percent ? { material, percent: Math.round((p / total) * 100) } : { material }));
}

/** Buys the next level of equipment. Returns why not, or null. */
export function upgradeLab(s: LabState, wallet: Wallet, reputation: number, data: LabData = lab): string | null {
  const next = data.levels[s.level];
  if (!next) return 'The lab is fully equipped.';
  if (reputation < next.reputation) return `Needs reputation ${next.reputation}.`;
  if (wallet.money < next.coins) return 'Not enough coins.';
  wallet.money -= next.coins;
  s.level += 1;
  return null;
}

/** Runs a challenge's sample through the lab. Returns why not, or null. */
export function runSample(s: LabState, wallet: Wallet, challengeId: string, data: LabData = lab): string | null {
  const c = data.challenges.find((x) => x.id === challengeId);
  if (!c) return 'No such sample.';
  if (s.level === 0) return 'Equip the lab first.';
  if (wallet.money < data.runCost) return 'Not enough coins.';
  wallet.money -= data.runCost;
  const level = data.levels[s.level - 1];
  s.analyses[c.id] = { level: s.level, components: analyse(entriesOf({ parts: c.target.formula, dilutions: c.target.dilutions }), level) };
  return null;
}

/** Records an attempt. Returns the reward the first time it reaches three stars. */
export function recordChallenge(s: LabState, challengeId: string, stars: number, data: LabData = lab): Challenge['reward'] | null {
  const c = data.challenges.find((x) => x.id === challengeId);
  if (!c) return null;
  const rec = (s.challenges[c.id] ??= { best: 0 });
  rec.best = Math.max(rec.best, stars);
  if (stars >= 3 && !rec.rewarded) {
    rec.rewarded = true;
    return c.reward;
  }
  return null;
}
