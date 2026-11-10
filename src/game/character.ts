import characterJson from '../data/character.json';

// Player and customer looks, assembled from the chibi character kit made for this game
// (assets/custom/chibi/manifest.json). See src/data/README.md.

export interface CharacterOptions {
  kit: string;
  style: string;
  slots: { id: string; label: string; optional?: boolean }[];
  allowedParts: Record<string, string[]>;
  /** Colour pickers; `tab` is the slot whose creator page shows it. */
  colors: { id: string; label: string; palette: string; tab: string; customers?: boolean }[];
  /** Chance that a random customer wears each optional part. */
  customers: { optionalChance: number };
  /** Part ids from the kit the game used before, each with the part that replaces it (null: nothing does). */
  legacy?: { parts: Record<string, string | null> };
}

/** The parts of the kit manifest this game reads. */
export interface KitStyle {
  id: string;
  skeleton: string;
  animations: { file: string; clips: (string | { name: string; seat?: number })[] };
  defaults: { fit: string; parts: Record<string, string>; colors: Record<string, string> };
  palettes: Record<string, string[]>;
  fits: { id: string; morph: string | null; thumb?: string }[];
  /** `thumb` is a small picture of the part for the character creator, beside the manifest. */
  parts: { id: string; slot: string; file: string; name: Record<string, string>; thumb?: string }[];
}

export interface CharacterConfig {
  /** Body shape: a fit id from the kit (classic, chubby, slim). */
  fit: string;
  /** Slot → part id. The body part follows the fit. */
  parts: Record<string, string>;
  /** skin, hair, eyes, plus a main colour per clothing slot (e.g. top). */
  colors: Record<string, string>;
}

export const characterOptions = characterJson as CharacterOptions;

export function defaultCharacter(style: KitStyle): CharacterConfig {
  return { fit: style.defaults.fit, parts: { ...style.defaults.parts }, colors: { ...style.defaults.colors } };
}

/** Part ids to load for a config: the body for its fit, then every chosen slot. */
export function partsFor(config: CharacterConfig, style: KitStyle): { slot: string; file: string }[] {
  const byId = new Map(style.parts.map((p) => [p.id, p]));
  const body = style.parts.find((p) => p.slot === 'body' && p.id === `body_${config.fit}`) ?? style.parts.find((p) => p.slot === 'body');
  const chosen = Object.entries(config.parts)
    .filter(([slot]) => slot !== 'body')
    .map(([, id]) => byId.get(id))
    .filter((p): p is KitStyle['parts'][number] => p !== undefined);
  return [body, ...chosen].filter((p) => p !== undefined).map((p) => ({ slot: p!.slot, file: p!.file }));
}

/** A random look for a customer. `random` returns numbers in [0, 1). */
export function randomCharacter(style: KitStyle, options: CharacterOptions, random: () => number): CharacterConfig {
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const parts: Record<string, string> = {};
  for (const slot of options.slots) {
    const allowed = options.allowedParts[slot.id] ?? [];
    if (allowed.length === 0) continue;
    if (slot.optional && random() >= options.customers.optionalChance) continue;
    parts[slot.id] = pick(allowed);
  }
  const colors: Record<string, string> = {};
  for (const c of options.colors) {
    if (c.customers === false) continue; // the part keeps the colour it was made in
    const palette = style.palettes[c.palette];
    if (palette?.length) colors[c.id] = pick(palette);
  }
  return { fit: pick(style.fits).id, parts, colors };
}

/**
 * Carries a saved look over to the current kit: part ids the kit no longer has are swapped
 * through `legacy.parts` in character.json (null means the slot is left empty), slots that
 * must be filled fall back to the kit default, and an unknown body shape becomes the default.
 * A look that already fits the kit comes back unchanged.
 */
export function migrateCharacter(config: CharacterConfig, style: KitStyle, options: CharacterOptions): CharacterConfig {
  const slotOf = new Map(style.parts.map((p) => [p.id, p.slot]));
  const legacy = options.legacy?.parts ?? {};
  const parts: Record<string, string> = {};
  for (const slot of options.slots) {
    if (slot.id === 'body') continue;
    const had = config.parts[slot.id];
    let id: string | null | undefined = had;
    if (had && slotOf.get(had) !== slot.id) id = had in legacy ? legacy[had] : undefined;
    if (id && slotOf.get(id) === slot.id) parts[slot.id] = id;
    else if (!slot.optional && style.defaults.parts[slot.id]) parts[slot.id] = style.defaults.parts[slot.id];
  }
  const fit = style.fits.some((f) => f.id === config.fit) ? config.fit : style.defaults.fit;
  return { fit, parts, colors: { ...config.colors } };
}

export function validateCharacterOptions(options: CharacterOptions, style: KitStyle): string[] {
  const errors: string[] = [];
  const parts = new Map(style.parts.map((p) => [p.id, p]));
  for (const slot of options.slots) {
    for (const id of options.allowedParts[slot.id] ?? []) {
      const part = parts.get(id);
      if (!part) errors.push(`allowedParts.${slot.id}: unknown part "${id}"`);
      else if (part.slot !== slot.id) errors.push(`allowedParts.${slot.id}: "${id}" belongs to slot "${part.slot}"`);
    }
  }
  for (const c of options.colors) if (!style.palettes[c.palette]) errors.push(`colors.${c.id}: unknown palette "${c.palette}"`);
  for (const [old, id] of Object.entries(options.legacy?.parts ?? {})) {
    if (parts.has(old)) errors.push(`legacy.parts: "${old}" is still a part of the kit`);
    if (id !== null && !parts.has(id)) errors.push(`legacy.parts.${old}: unknown part "${id}"`);
  }
  return errors;
}
