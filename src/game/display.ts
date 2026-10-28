import { recognizeAccords } from './accords';
import { effective, written, type Entry } from './blend';
import { content, materialsById } from './content';
import { longevityOf } from './scoring';
import { clients } from './clients';
import { consume, type SourcingState } from './sourcing';
import { furniture, type FurnitureData } from './upgrades';

// The display case: bottles of your signature perfumes that sell while you're away.
// Sales are worked out from timestamps (game hours), so they happen offline too.

export interface Listing {
  id: string;
  name: string;
  entries: Entry[];
  bottles: number;
  /** Coins per bottle, fixed when listed. */
  price: number;
  /** When the next sale's clock started. */
  lastSaleAt: number;
}

export interface DisplayState {
  listings: Listing[];
  nextId: number;
  /** Sales since you last looked, for the "while you were away" note. */
  unseen: { bottles: number; coins: number };
}

export function newDisplayState(): DisplayState {
  return { listings: [], nextId: 1, unseen: { bottles: 0, coins: 0 } };
}

/** What a bottle of this blend is worth on the shelf: richer, longer, well-built perfumes sell for more. */
export function bottlePrice(blend: Entry[], quality: number, payMultiplier: number, data: FurnitureData = furniture): number {
  const d = data.display;
  const accords = recognizeAccords(written(blend), content.accords, materialsById).length;
  const layers = new Set(blend.map((e) => materialsById.get(e.material)?.layer)).size;
  const hours = longevityOf(effective(blend), materialsById, content.model, clients.scoring);
  const raw = d.basePrice + accords * d.pricePerAccord + layers * d.pricePerLayer + hours * d.pricePerLongevityHour;
  return Math.round(Math.min(d.maxPrice, raw * quality) * payMultiplier);
}

/** Bottles a formula for the display case, using up stock. Returns why not, or null. */
export function listPerfume(
  d: DisplayState,
  stock: SourcingState,
  formula: { name: string; entries: Entry[] },
  bottles: number,
  capacity: number,
  now: number,
  payMultiplier: number,
): string | null {
  if (d.listings.length >= capacity) return capacity === 0 ? 'Place a display case first (Shop → Furniture).' : 'The display cases are full.';
  let quality = 0;
  for (let i = 0; i < bottles; i++) {
    const q = consume(stock, formula.entries, now);
    if (q === null) {
      if (i === 0) return 'Not enough materials in stock to bottle it.';
      bottles = i;
      break;
    }
    quality += q;
  }
  quality /= bottles;
  d.listings.push({ id: `p${d.nextId++}`, name: formula.name, entries: formula.entries, bottles, price: bottlePrice(formula.entries, quality, payMultiplier), lastSaleAt: now });
  return null;
}

/** Sells whatever has sold since last time. `interval` is game hours per sale. Returns coins earned. */
export function settleSales(d: DisplayState, now: number, interval: number): { bottles: number; coins: number } {
  let bottles = 0;
  let coins = 0;
  for (const l of d.listings) {
    const due = Math.floor((now - l.lastSaleAt) / interval);
    const sold = Math.min(due, l.bottles);
    if (sold <= 0) continue;
    l.bottles -= sold;
    l.lastSaleAt = l.bottles > 0 ? l.lastSaleAt + sold * interval : now;
    bottles += sold;
    coins += sold * l.price;
  }
  d.listings = d.listings.filter((l) => l.bottles > 0);
  d.unseen.bottles += bottles;
  d.unseen.coins += coins;
  return { bottles, coins };
}

export function removeListing(d: DisplayState, id: string): void {
  d.listings = d.listings.filter((l) => l.id !== id);
}
