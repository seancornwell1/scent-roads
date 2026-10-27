import { recognizeAccords } from './game/accords';
import { content, materialsById } from './game/content';
import { loadSave, newSave, writeSave, type SaveData } from './game/save';
import type { Formula } from './game/types';

/** 'shop' is the 3D scene alone; the others are panels over it. */
export type Screen = 'shop' | 'organ' | 'book' | 'creator';

export interface UiState {
  screen: Screen;
  organTab: 'materials' | 'formula';
  browseBy: 'layer' | 'family';
  /** Parts added per tap. */
  step: number;
  /** Material whose details sheet is open. */
  detail: string | null;
  /** Accords hit since the banner was last dismissed. */
  newAccords: string[];
  /** Which page of the character creator is showing (a slot id). */
  creatorTab: string;
  /** A short message over the scene, e.g. for placeholders. */
  toast: string | null;
}

function initSave(): SaveData {
  const ids = content.materials.map((m) => m.id);
  const save = loadSave() ?? newSave(Date.now(), ids, content.model.testStockGrams);
  // Materials added to the data after this save was made still get test stock.
  for (const id of ids) if (!(id in save.stock)) save.stock[id] = content.model.testStockGrams;
  return save;
}

export const state: { save: SaveData; ui: UiState } = {
  save: initSave(),
  ui: { screen: 'shop', organTab: 'materials', browseBy: 'layer', step: 1, detail: null, newAccords: [], toast: null, creatorTab: 'body' },
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
