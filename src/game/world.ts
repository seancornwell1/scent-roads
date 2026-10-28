import { entriesOf } from './blend';
import { clients, type Brief, type Target } from './clients';
import { content, materialsById } from './content';
import { rankById, ranks } from './ranks';
import type { ClueContext } from './signature';
import { story } from './story';
import { blendProfile, briefWeight, regularWelcome, shopStyle } from './style';
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

/** A brief's own family profile, for matching it to the shop's style. */
const leans = new Map<string, Record<string, number>>();
export function briefLean(b: Brief): Record<string, number> {
  let lean = leans.get(b.id);
  if (!lean) {
    lean = blendProfile(entriesOf({ parts: b.target.formula, dilutions: b.target.dilutions }), materialsById, content.model);
    leans.set(b.id, lean);
  }
  return lean;
}

/** Whether your rank lets you take a brief: diluted materials and budgets come with rank. */
export function rankAllows(save: SaveData, b: Brief): boolean {
  const rank = rankById(save.rank);
  const diluted = Object.values(b.target.dilutions ?? {}).some((d) => d < 100);
  return (!diluted || rank.dilutions) && (b.budget === undefined || rank.budgets);
}

/** How customers arrive right now: the shop's appeal and style, your rank, and any fair in the news. */
export function arrivalConditions(save: SaveData, gameHours: number) {
  const { level } = shopAppeal(save);
  const style = shopStyle(save.styleHistory ?? []);
  return {
    arrivalMultiplier: level.arrivalMultiplier * arrivalMultiplier(newsFor(save, gameHours)),
    payMultiplier: level.payMultiplier * rankById(save.rank).payMultiplier,
    strictness: level.strictness,
    canTake: (b: Brief) => rankAllows(save, b),
    weightOf: (b: Brief) => briefWeight(briefLean(b), style),
    welcomes: (r: Parameters<typeof regularWelcome>[0]) => regularWelcome(r, style),
  };
}

/** Your progress, for her signature's clues. */
export function clueContext(save: SaveData): ClueContext {
  const rankIndex = ranks.indexOf(rankById(save.rank));
  return {
    requestsDone: new Set(Object.entries(save.story!.requests).filter(([, r]) => r.status === 'done').map(([id]) => id)),
    routesOpen: new Set(Object.entries(save.routes!.routes).filter(([, r]) => r.status === 'open').map(([id]) => id)),
    pages: new Set(Object.keys(save.story!.pages)),
    ranks: new Set(ranks.slice(0, rankIndex + 1).map((r) => r.id)),
    reviews: save.customers!.reviews.length,
  };
}

/** Every perfume the award judges already know: briefs, her pages and the accord lessons. */
export function knownTargets(): Target[] {
  return [
    ...clients.briefs.map((b) => b.target),
    ...clients.regulars.flatMap((r) => r.briefs.map((b) => b.target)),
    ...story.requests.map((r) => r.brief.target),
    ...content.accords.map((a) => ({ formula: a.example.parts, dilutions: a.example.dilutions })),
  ];
}
