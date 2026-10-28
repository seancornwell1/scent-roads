import eventsJson from '../data/events.json';
import { seededRandom } from './random';

// The newspaper: a few events each game week (bumper crops, storms, price swings, fairs),
// chosen from a seed so they're the same however often you open the app.

export interface EventType {
  id: string;
  target: 'crop' | 'region' | 'material' | 'none';
  headline: string;
  body: string;
  effect: { yield?: number; shippingExtraGameHours?: number; price?: number; arrivals?: number };
}

export interface NewsItem {
  type: string;
  headline: string;
  body: string;
  region?: string;
  material?: string;
  effect: EventType['effect'];
}

export interface EventsData {
  paper: string;
  perWeek: [number, number];
  types: EventType[];
}

export const events = eventsJson as unknown as EventsData;

export const HOURS_PER_WEEK = 24 * 7;

export function weekOf(gameHours: number): number {
  return Math.floor(gameHours / HOURS_PER_WEEK);
}

export interface NewsContext {
  /** Open regions and their crops, by name. */
  crops: { region: string; regionName: string; material: string; materialName: string }[];
  /** Materials you can buy, by name. */
  materials: { id: string; name: string }[];
}

/** The week's events, deterministic for a seed and week number. */
export function generateWeek(week: number, seed: number, ctx: NewsContext, data: EventsData = events): NewsItem[] {
  const random = seededRandom(seed * 7919 + week * 104729);
  const [min, max] = data.perWeek;
  const count = min + Math.floor(random() * (max - min + 1));
  const items: NewsItem[] = [];
  const used = new Set<string>();
  for (let i = 0; i < count * 4 && items.length < count; i++) {
    const type = data.types[Math.floor(random() * data.types.length)];
    if (used.has(type.id)) continue;
    const pickCrop = ctx.crops[Math.floor(random() * ctx.crops.length)];
    const pickMaterial = ctx.materials[Math.floor(random() * ctx.materials.length)];
    let fill: Record<string, string> = {};
    const item: NewsItem = { type: type.id, headline: '', body: '', effect: type.effect };
    if (type.target === 'crop' || type.target === 'region') {
      if (!pickCrop) continue;
      item.region = pickCrop.region;
      if (type.target === 'crop') item.material = pickCrop.material;
      fill = { region: pickCrop.regionName, material: pickCrop.materialName.toLowerCase() };
    } else if (type.target === 'material') {
      if (!pickMaterial) continue;
      item.material = pickMaterial.id;
      fill = { material: pickMaterial.name };
    }
    const sub = (t: string) => t.replace(/\{(\w+)\}/g, (_, k: string) => fill[k] ?? '');
    item.headline = sub(type.headline);
    item.body = sub(type.body);
    used.add(type.id);
    items.push(item);
  }
  return items;
}

export function yieldMultiplier(news: NewsItem[], region: string, material: string): number {
  return news.filter((n) => n.region === region && n.material === material && n.effect.yield).reduce((m, n) => m * n.effect.yield!, 1);
}

export function shippingDelay(news: NewsItem[], region: string): number {
  return news.filter((n) => n.region === region && n.effect.shippingExtraGameHours).reduce((h, n) => h + n.effect.shippingExtraGameHours!, 0);
}

export function priceMultiplier(news: NewsItem[], material: string): number {
  return news.filter((n) => n.material === material && n.effect.price).reduce((m, n) => m * n.effect.price!, 1);
}

export function arrivalMultiplier(news: NewsItem[]): number {
  return news.filter((n) => n.effect.arrivals).reduce((m, n) => m * n.effect.arrivals!, 1);
}
