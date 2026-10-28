import unlocksJson from '../data/unlocks.json';

// Which materials the player has, by reputation. See src/data/unlocks.json.

export interface Tier {
  id: string;
  name: string;
  reputation: number;
  teaches: string;
  materials: string[];
}

export interface Unlocks {
  sources: Record<'natural' | 'synthetic', { name: string; how: string }>;
  tiers: Tier[];
}

export const unlocks = unlocksJson as Unlocks;

/** Index of the highest tier reached at this reputation. */
export function tierIndex(reputation: number, data: Unlocks = unlocks): number {
  let index = 0;
  data.tiers.forEach((t, i) => {
    if (reputation >= t.reputation) index = i;
  });
  return index;
}

export function unlockedMaterialIds(reputation: number, data: Unlocks = unlocks): Set<string> {
  const reached = tierIndex(reputation, data);
  return new Set(data.tiers.slice(0, reached + 1).flatMap((t) => t.materials));
}

export function nextTier(reputation: number, data: Unlocks = unlocks): Tier | null {
  return data.tiers[tierIndex(reputation, data) + 1] ?? null;
}

/** `storyMaterials` are given by the story instead of unlocked by reputation. */
export function validateUnlocks(data: Unlocks, materialIds: Set<string>, storyMaterials: Set<string> = new Set()): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  data.tiers.forEach((t, i) => {
    if (i > 0 && t.reputation <= data.tiers[i - 1].reputation) errors.push(`tier "${t.id}": reputation must increase`);
    for (const id of t.materials) {
      if (!materialIds.has(id)) errors.push(`tier "${t.id}": unknown material "${id}"`);
      if (seen.has(id)) errors.push(`tier "${t.id}": "${id}" already unlocked earlier`);
      seen.add(id);
    }
  });
  for (const id of materialIds) if (!seen.has(id) && !storyMaterials.has(id)) errors.push(`material "${id}" is never unlocked`);
  return errors;
}
