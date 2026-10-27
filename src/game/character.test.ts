import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { characterOptions, defaultCharacter, partsFor, randomCharacter, validateCharacterOptions, type KitStyle } from './character';

const manifest = JSON.parse(readFileSync(new URL('../../assets/grab3d/characters/manifest.json', import.meta.url), 'utf8'));
const style: KitStyle = manifest.styles.find((s: KitStyle) => s.id === characterOptions.style);

describe('character options', () => {
  it('only allow parts that exist in the kit, in the right slot', () => {
    expect(validateCharacterOptions(characterOptions, style)).toEqual([]);
  });

  it('every part file is downloaded', () => {
    for (const p of style.parts) expect(() => readFileSync(new URL(`../../assets/grab3d/characters/${p.file}`, import.meta.url))).not.toThrow();
  });
});

describe('partsFor', () => {
  it('starts with the body for the fit', () => {
    const config = { ...defaultCharacter(style), fit: 'chubby' };
    const parts = partsFor(config, style);
    expect(parts[0]).toEqual({ slot: 'body', file: 'cozy/parts/body_chubby.glb' });
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
    }
  });
});
