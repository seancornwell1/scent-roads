import { recognizeAccords } from './game/accords';
import { content, materialsById } from './game/content';
import { gameNow, newClock } from './game/clock';
import { newCustomerState } from './game/customers';
import { newDisplayState } from './game/display';
import { newSourcingState, sourcing } from './game/sourcing';
import { newStoryState, story } from './game/story';
import { newUpgradeState } from './game/upgrades';
import { loadSave, newSave, writeSave, type SaveData } from './game/save';
import type { Formula } from './game/types';

/** 'shop' is the 3D scene alone; the others are panels over it. */
export type Screen = 'shop' | 'intro' | 'organ' | 'book' | 'creator' | 'customer' | 'reaction' | 'unlock' | 'backroom' | 'upgrades' | 'news' | 'options';

export interface UiState {
  screen: Screen;
  organTab: 'materials' | 'formula';
  browseBy: 'layer' | 'family';
  /** Material whose details sheet is open. */
  detail: string | null;
  /** Accords hit since the banner was last dismissed. */
  newAccords: string[];
  /** The customer whose panel is open. */
  visitId: string | null;
  /** The customer you're composing for at the organ. */
  orderId: string | null;
  /** Which tab of the back room is showing. */
  backroomTab: 'map' | 'harvests' | 'supplier' | 'stock';
  /** Which tab of the shop-upgrades panel is showing. */
  upgradesTab: 'furniture' | 'display' | 'regions' | 'processing';
  /** A spot picked in the furniture tab, waiting for something to place on it. */
  pickSpot: string | null;
  /** Which page of the character creator is showing (a slot id). */
  creatorTab: string;
  /** A short message over the scene, e.g. for placeholders. */
  toast: string | null;
}

function initSave(): SaveData {
  const now = Date.now();
  const save = loadSave() ?? newSave(now);
  // Fill in parts of the save that older versions didn't have.
  save.customers ??= newCustomerState(now);
  save.announcedTier ??= 0;
  save.clock ??= newClock(now);
  if (!save.sourcing) {
    // A new game: her bench (a few bottles left on the organ) and some coins to buy more.
    save.sourcing = newSourcingState();
    for (const b of story.bench) save.sourcing.inventory.push({ id: `l${save.sourcing.nextId++}`, material: b.material, grams: b.grams, quality: 1, since: 0 });
    save.customers.money += sourcing.startingCoins;
  }
  save.story ??= newStoryState();
  save.upgrades ??= newUpgradeState();
  save.display ??= newDisplayState();
  save.news ??= {};
  save.newsSeenWeek ??= -1;
  save.notify ??= false;
  delete (save as { stock?: unknown }).stock;
  return save;
}

export const state: { save: SaveData; ui: UiState } = {
  save: initSave(),
  ui: { screen: 'shop', organTab: 'materials', browseBy: 'layer', detail: null, newAccords: [], toast: null, creatorTab: 'body', visitId: null, orderId: null, backroomTab: 'map', upgradesTab: 'furniture', pickSpot: null },
};

let render = () => {};
export function onChange(fn: () => void): void {
  render = fn;
}

/** Persists the save and redraws. Call after any change to state. */
export function commit(): void {
  writeSave(state.save);
  render();
}

/** Replaces the organ's formula and records any accord hit for the first time. */
export function setDraft(formula: Formula): void {
  state.save.draft = formula;
  const now = Date.now();
  for (const accord of recognizeAccords(formula, content.accords, materialsById)) {
    if (state.save.discoveredAccords[accord.id]) continue;
    state.save.discoveredAccords[accord.id] = { at: now, formula: { ...formula } };
    state.ui.newAccords.push(accord.id);
  }
  commit();
}

/** The current game time, in game hours. */
export function nowGame(): number {
  return gameNow(state.save.clock!, Date.now());
}
