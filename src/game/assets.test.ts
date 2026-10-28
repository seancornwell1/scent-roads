import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import sounds from '../data/sounds.json';

const root = new URL('../../', import.meta.url);
const credits = readFileSync(new URL('CREDITS.md', root), 'utf8');

describe('assets', () => {
  it('has every sound file a cue points at, each credited', () => {
    const files = Object.values(sounds.cues as Record<string, { file: string | null }>)
      .map((c) => c.file)
      .filter((f): f is string => !!f);
    expect(files.filter((f) => !existsSync(new URL(`assets/${f}`, root)))).toEqual([]);
    expect(files.filter((f) => !credits.includes(`assets/${f}`))).toEqual([]);
  });

  it('credits the floor tile and app icons', () => {
    for (const f of ['grab3d/models/modular-floor-tile.glb', 'icons/icon-512.png']) expect(credits).toContain(`assets/${f}`);
  });
});
