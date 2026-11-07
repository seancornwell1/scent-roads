import { describe, expect, it } from 'vitest';
import { content, materialsById } from './content';
import { dropsWorth, missCause, radarOf, scoreRadar, shapeMatch, SPOKES, targetOf, validateRadar } from './radar';

describe('radar', () => {
  it('has a vector for every material, and valid accords and clashes', () => {
    expect(validateRadar(content.materials, new Set(content.accords.map((a) => a.id)))).toEqual([]);
  });

  it('pushes each spoke by a material’s vector, more for stronger materials', () => {
    const r = radarOf({ bergamot: 1 });
    expect(r.shape.citrus).toBeGreaterThan(0.5);
    expect(r.values.amber).toBe(0);
    expect(radarOf({ 'cis-3-hexenol': 1 }).intensity).toBeGreaterThan(radarOf({ 'iso-e-super': 1 }).intensity);
  });

  it('gives each extra drop less push than the last', () => {
    expect(dropsWorth(2) - dropsWorth(1)).toBeLessThan(dropsWorth(1));
    expect(dropsWorth(10) - dropsWorth(9)).toBeLessThan(dropsWorth(3) - dropsWorth(2));
    const one = radarOf({ labdanum: 1 }).intensity;
    expect(radarOf({ labdanum: 4 }).intensity).toBeLessThan(4 * one);
  });

  it('grows with every material added, so correcting risks overshooting', () => {
    const a = radarOf({ labdanum: 3, vanillin: 2 });
    const b = radarOf({ labdanum: 3, vanillin: 2, bergamot: 2 });
    expect(b.intensity).toBeGreaterThan(a.intensity);
  });

  it('pushes further for an accord than the parts alone', () => {
    const together = radarOf({ labdanum: 3, vanillin: 3 });
    const apart = radarOf({ labdanum: 3 }).values.amber + radarOf({ vanillin: 3 }).values.amber;
    expect(together.accords).toContain('amber');
    expect(together.values.amber).toBeGreaterThan(apart);
  });

  it('shrinks and reports a clash, and a crowded mix', () => {
    const plain = radarOf({ 'rose-damascena': 3 }).intensity + radarOf({ peppermint: 2 }).intensity;
    const clash = radarOf({ 'rose-damascena': 3, peppermint: 2 });
    expect(clash.muddy).toContain('mint-flowers');
    expect(clash.intensity).toBeLessThan(plain);
    const crowded = radarOf({ bergamot: 1, lemon: 1, lavender: 1, rosemary: 1, labdanum: 1, vanillin: 1, frankincense: 1 });
    expect(crowded.muddy).toContain('crowded');
  });

  it('fades volatile materials over time', () => {
    const opening = radarOf({ bergamot: 3, labdanum: 3 });
    const drydown = radarOf({ bergamot: 3, labdanum: 3 }, 8);
    expect(drydown.shape.citrus).toBeLessThan(opening.shape.citrus);
    expect(drydown.shape.amber).toBeGreaterThan(opening.shape.amber);
  });

  it('scores a perfect match three stars, and names the cause of a miss', () => {
    const target = targetOf(radarOf({ labdanum: 3, vanillin: 2, bergamot: 1 }));
    const same = scoreRadar(radarOf({ labdanum: 3, vanillin: 2, bergamot: 1 }), target);
    expect(same.shape).toBeCloseTo(1);
    expect(same.stars).toBe(3);
    const woody = radarOf({ labdanum: 3, vanillin: 2, bergamot: 1, 'cedarwood-virginia': 4 });
    expect(scoreRadar(woody, target).stars).toBeLessThan(3);
    expect(missCause(woody, target)).toMatch(/cedar.*woody/i);
    const faint = radarOf({ labdanum: 1, vanillin: 1 });
    expect(missCause(faint, target)).toBeTruthy();
    expect(shapeMatch(target.shape, target.shape)).toBeCloseTo(1);
    expect(SPOKES).toHaveLength(8);
    expect(materialsById.get('labdanum')!.radar.verified).toBe(false);
  });
});
