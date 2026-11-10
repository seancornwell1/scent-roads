import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import clientsJson from '../data/clients.json';
import storyJson from '../data/story.json';
import {
  characterOptions,
  defaultCharacter,
  migrateCharacter,
  partsFor,
  randomCharacter,
  validateCharacterOptions,
  type CharacterConfig,
  type KitStyle,
} from './character';

const kitFile = (path: string) => new URL(`../../assets/${characterOptions.kit.replace(/[^/]+$/, '')}${path}`, import.meta.url);
const manifest = JSON.parse(readFileSync(new URL(`../../assets/${characterOptions.kit}`, import.meta.url), 'utf8'));
const style: KitStyle = manifest.styles.find((s: KitStyle) => s.id === characterOptions.style);
const slotOf = new Map(style.parts.map((p) => [p.id, p.slot]));

describe('character options', () => {
  it('only allow parts that exist in the kit, in the right slot', () => {
    expect(validateCharacterOptions(characterOptions, style)).toEqual([]);
  });

  it('every part file is in the kit folder', () => {
    for (const p of style.parts) expect(() => readFileSync(kitFile(p.file))).not.toThrow();
  });

  it('every choice in the creator has a thumbnail on disk', () => {
    const offered = Object.values(characterOptions.allowedParts).flat();
    for (const id of offered) {
      const thumb = style.parts.find((p) => p.id === id)?.thumb;
      expect(thumb, id).toBeTruthy();
      expect(() => readFileSync(kitFile(thumb!)), id).not.toThrow();
    }
    for (const f of style.fits) expect(() => readFileSync(kitFile(f.thumb!)), f.id).not.toThrow();
  });

  it('the kit default is a look the creator can make', () => {
    const look = defaultCharacter(style);
    for (const [slot, id] of Object.entries(look.parts)) if (slot !== 'body') expect(characterOptions.allowedParts[slot], id).toContain(id);
  });
});

describe('partsFor', () => {
  it('starts with the body, then the chosen parts', () => {
    const config = { ...defaultCharacter(style), fit: 'chubby' };
    const parts = partsFor(config, style);
    expect(parts[0]).toEqual({ slot: 'body', file: 'parts/body.glb' });
    expect(parts.map((p) => p.slot)).toContain('hair');
  });
});

describe('randomCharacter', () => {
  it('builds valid looks from allowed parts', () => {
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 50; i++) {
      const c = randomCharacter(style, characterOptions, random);
      expect(style.fits.map((f) => f.id)).toContain(c.fit);
      for (const [slot, id] of Object.entries(c.parts)) expect(characterOptions.allowedParts[slot]).toContain(id);
      expect(c.parts.top).toBeDefined();
      expect(c.colors.skin).toMatch(/^#/);
      // Glasses and hand-held things keep the colours they were made in.
      for (const color of characterOptions.colors.filter((x) => x.customers === false)) expect(c.colors[color.id]).toBeUndefined();
    }
  });
});

describe('migrateCharacter', () => {
  // A look as the creator saved it with the Grab3D Character Mixer parts.
  const old: CharacterConfig = {
    fit: 'chubby',
    parts: { head: 'head_sunny', hair: 'hair_braids', hat: 'hat_wizard', face: 'face_heartglasses', top: 'top_tunic', bottom: 'bottom_cargo', shoes: 'shoes_clogs', handL: 'handL_flower' },
    colors: { skin: '#C68A63', hair: '#3B2A24', eyes: '#3B2A24', top: '#8FB79A', bottom: '#4A4858' },
  };

  it('swaps the parts of the earlier kit for parts of this one', () => {
    const look = migrateCharacter(old, style, characterOptions);
    expect(look.fit).toBe('chubby');
    expect(look.colors).toEqual(old.colors);
    expect(look.parts).toEqual({
      head: 'head_bright',
      hair: 'hair_long',
      hat: 'hat_beret',
      face: 'face_round',
      top: 'top_blouse',
      bottom: 'bottom_trousers',
      shoes: 'shoes_maryjanes',
    });
    for (const [slot, id] of Object.entries(look.parts)) expect(slotOf.get(id)).toBe(slot);
  });

  it('leaves a look made with this kit alone', () => {
    const once = migrateCharacter(old, style, characterOptions);
    expect(migrateCharacter(once, style, characterOptions)).toEqual(once);
    const fresh = defaultCharacter(style);
    const { body: _body, ...parts } = fresh.parts;
    expect(migrateCharacter(fresh, style, characterOptions)).toEqual({ ...fresh, parts });
  });

  it('fills what it cannot place: defaults for needed slots, nothing for optional ones', () => {
    const look = migrateCharacter({ fit: 'huge', parts: { hair: 'hair_gone', hat: 'hat_gone', top: 'shoes_boots' }, colors: {} }, style, characterOptions);
    expect(look.fit).toBe(style.defaults.fit);
    expect(look.parts.hair).toBe(style.defaults.parts.hair);
    expect(look.parts.top).toBe(style.defaults.parts.top);
    expect(look.parts.hat).toBeUndefined();
    expect(partsFor(look, style).length).toBeGreaterThan(5);
  });
});

describe('the looks of townspeople and regulars', () => {
  const looks: [string, CharacterConfig][] = [
    ...storyJson.people.map((p): [string, CharacterConfig] => [p.id, p.look as unknown as CharacterConfig]),
    ...clientsJson.regulars.map((r): [string, CharacterConfig] => [r.id, r.look as unknown as CharacterConfig]),
  ];

  it('use parts of the kit, each in its own slot', () => {
    expect(looks.length).toBeGreaterThan(0);
    for (const [who, look] of looks) {
      expect(style.fits.map((f) => f.id), who).toContain(look.fit);
      for (const [slot, id] of Object.entries(look.parts)) expect(slotOf.get(id), `${who} ${id}`).toBe(slot);
      expect(migrateCharacter(look, style, characterOptions), who).toEqual(look);
    }
  });
});
