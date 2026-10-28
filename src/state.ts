import { recognizeAccords } from './game/accords';
import { entriesOf, written, type Dilutions, type Entry } from './game/blend';
import { rankById, type Rank } from './game/ranks';
import { content, materialsById } from './game/content';
import { gameNow, newClock } from './game/clock';
import { newCustomerState } from './game/customers';
import { newHouseState, type HouseLabel } from './game/house';
import { newSourcingState, sourcing } from './game/sourcing';
import { newStoryState, story } from './game/story';
import { newRoutesState } from './game/routes';
import { newLearningState } from './game/learning';
import { newSignatureState } from './game/signature';
import { newAwardsState } from './game/awards';
import { newLabState } from './game/lab';
import { newUpgradeState } from './game/upgrades';
import { loadSave, newSave, writeSave, type SaveData } from './game/save';
import type { Formula } from './game/types';

/** 'shop' is the 3D scene alone; the others are panels over it. */
export type Screen = 'shop' | 'house-new' | 'report' | 'intro' | 'chapter' | 'training' | 'exam' | 'signature' | 'epilogue' | 'sheet' | 'organ' | 'book' | 'creator' | 'customer' | 'reaction' | 'unlock' | 'backroom' | 'upgrades' | 'news' | 'options';

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
  /** The customer you're composing for at the organ (or "exam" for a rank exam's accord). */
  orderId: string | null;
  /** Which tab of the back room is showing. */
  backroomTab: 'letters' | 'map' | 'harvests' | 'supplier' | 'stock' | 'lab';
  /** Which tab of the shop-upgrades panel is showing. */
  upgradesTab: 'furniture' | 'house' | 'processing';
  /** A house perfume being set up: its formula, name, label, price tier and bottles. */
  houseNew: { formulaId: string; name: string; seed: number; label: HouseLabel; tier: string; bottles: number } | null;
  /** The day whose sales report is open (the latest if null). */
  reportDay: number | null;
  /** A spot picked in the furniture tab, waiting for something to place on it. */
  pickSpot: string | null;
  /** Which page of the character creator is showing (a slot id). */
  creatorTab: string;
  /** The formula whose sheet is open, and the batch size (grams of concentrate). */
  sheetId: string | null;
  sheetBatch: number;
  /** Parts added per tap at the organ (1 at 10 parts; 1, 5 or 10 at 100 parts). */
  step: number;
  /** Which tab of the formula book is showing, and which compendium page is open. */
  bookTab: 'pages' | 'compendium' | 'accords' | 'formulas' | 'reviews';
  compendiumId: string | null;
  /** In nose training, the question whose answer is being shown. */
  trainingFeedback: number | null;
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
  save.routes ??= newRoutesState();
  save.learning ??= newLearningState();
  save.rank ??= 'apprentice';
  save.exam ??= null;
  save.bases ??= [];
  save.styleHistory ??= [];
  save.draftDilutions ??= {};
  save.signature ??= newSignatureState();
  save.awards ??= newAwardsState();
  save.lab ??= newLabState();
  save.upgrades ??= newUpgradeState();
  save.house ??= newHouseState(gameNow(save.clock, now));
  save.news ??= {};
  save.newsSeenWeek ??= -1;
  save.notify ??= false;
  delete (save as { stock?: unknown }).stock;
  return save;
}

export const state: { save: SaveData; ui: UiState } = {
  save: initSave(),
  ui: { screen: 'shop', organTab: 'materials', browseBy: 'layer', step: 1, sheetId: null, sheetBatch: 10, bookTab: 'pages', compendiumId: null, trainingFeedback: null, detail: null, newAccords: [], toast: null, creatorTab: 'body', visitId: null, orderId: null, backroomTab: 'letters', upgradesTab: 'furniture', pickSpot: null, houseNew: null, reportDay: null },
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

/** Your rank (apprentice until you pass an exam). */
export function currentRank(): Rank {
  return rankById(state.save.rank);
}

/** The formula on the organ, expanded: materials at their dilutions, bases opened up. */
export function draftBlend(): Entry[] {
  return entriesOf({ parts: state.save.draft, dilutions: state.save.draftDilutions }, state.save.bases);
}

/** Replaces the organ's formula (and optionally its dilutions) and records any accord hit for the first time. */
export function setDraft(formula: Formula, dilutions?: Dilutions): void {
  state.save.draft = formula;
  // A formula worked on with no order open is yours: the next order keeps it on the organ.
  if (!state.ui.orderId) state.save.draftFor = undefined;
  if (dilutions) state.save.draftDilutions = { ...dilutions };
  for (const id of Object.keys(state.save.draftDilutions ?? {})) if (!(id in formula)) delete state.save.draftDilutions![id];
  const now = Date.now();
  const asWritten = written(draftBlend());
  for (const accord of recognizeAccords(asWritten, content.accords, materialsById)) {
    if (state.save.discoveredAccords[accord.id]) continue;
    state.save.discoveredAccords[accord.id] = { at: now, formula: { ...asWritten } };
    state.ui.newAccords.push(accord.id);
  }
  commit();
}

/** The current game time, in game hours. */
export function nowGame(): number {
  return gameNow(state.save.clock!, Date.now());
}
