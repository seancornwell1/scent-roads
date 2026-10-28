import { materialsById } from './content';
import { arrivalMultiplier, generateWeek, weekOf, type NewsItem } from './events';
import type { SaveData } from './save';
import { regions } from './sourcing';
import { unlockedMaterialIds } from './unlocks';
import { routeOpen } from './routes';
import { appealLevel, appealOf, type AppealLevel } from './upgrades';

// Glue between the systems: this week's newspaper and the shop's appeal, read from the save.

/** Materials you have: unlocked by reputation, plus any the story has given you. */
export function ownedMaterials(save: SaveData): Set<string> {
  const owned = unlockedMaterialIds(save.customers!.reputation);
  for (const id of save.story?.materials ?? []) owned.add(id);
  return owned;
}

/** This week's paper, printing it (and remembering it) the first time it's asked for. */
export function newsFor(save: SaveData, gameHours: number): NewsItem[] {
  const week = weekOf(gameHours);
  const news = save.news!;
  if (!news[week]) {
    const unlocked = ownedMaterials(save);
    const crops = regions
      .filter((r) => routeOpen(save.routes!, r.id))
      .flatMap((r) => r.crops.filter((c) => unlocked.has(c.material)).map((c) => ({ region: r.id, regionName: r.name, material: c.material, materialName: materialsById.get(c.material)?.name ?? c.material })));
    const materials = [...unlocked].map((id) => ({ id, name: materialsById.get(id)?.name ?? id }));
    news[week] = generateWeek(week, save.createdAt % 100000, { crops, materials });
    // Keep the last few weeks only.
    for (const key of Object.keys(news)) if (Number(key) < week - 3) delete news[Number(key)];
  }
  return news[week];
}

export function shopAppeal(save: SaveData): { appeal: number; level: AppealLevel } {
  const appeal = appealOf(save.upgrades!);
  return { appeal, level: appealLevel(appeal) };
}

/** How customers arrive right now: the shop's appeal, plus any fair in the news. */
export function arrivalConditions(save: SaveData, gameHours: number) {
  const { level } = shopAppeal(save);
  return {
    arrivalMultiplier: level.arrivalMultiplier * arrivalMultiplier(newsFor(save, gameHours)),
    payMultiplier: level.payMultiplier,
    strictness: level.strictness,
  };
}
