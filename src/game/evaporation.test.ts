import { describe, expect, it } from 'vitest';
import { content, materialsById } from './content';
import { drydown } from './evaporation';
import type { Formula } from './types';

// Each test encodes an observation from Sean's formula log, so tuning the
// model numbers in src/data can't silently contradict the course.

const profile = (formula: Formula) => drydown(formula, materialsById, content.model);
const shareOf = (formula: Formula, stage: number, id: string) =>
  profile(formula)[stage].shares.find((s) => s.materialId === id)?.share ?? 0;
const leader = (formula: Formula, stage: number) => profile(formula)[stage].shares[0].materialId;

const OPENING = 0;
const HEART = 1;
const DRYDOWN = 2;
const amberBase = { vanillin: 35, labdanum: 35, bergamot: 30 };

describe('drydown', () => {
  it('gives three stages whose shares add up to 100%', () => {
    const stages = profile(amberBase);
    expect(stages.map((s) => s.stage.id)).toEqual(['opening', 'heart', 'drydown']);
    for (const s of stages) expect(s.shares.reduce((sum, x) => sum + x.share, 0)).toBeCloseTo(100);
  });

  it('bergamot leads the amber opening and is nearly gone by the hour', () => {
    expect(leader(amberBase, OPENING)).toBe('bergamot');
    expect(shareOf(amberBase, HEART, 'bergamot')).toBeLessThan(10);
  });

  it('vanillin outlives everything and dominates the late drydown', () => {
    expect(leader(amberBase, DRYDOWN)).toBe('vanillin');
  });

  it('coumarin drowns the amber at 5 parts but not at 1', () => {
    expect(leader({ ...amberBase, coumarin: 5 }, HEART)).toBe('coumarin');
    expect(shareOf({ ...amberBase, coumarin: 1 }, HEART, 'coumarin')).toBeLessThan(15);
  });

  it('cedarwood grows in share as a blend ages', () => {
    const blend = { ...amberBase, 'cedarwood-virginia': 10 };
    expect(shareOf(blend, DRYDOWN, 'cedarwood-virginia')).toBeGreaterThan(shareOf(blend, OPENING, 'cedarwood-virginia'));
  });

  it('fig accord: Stemone leads the opening, octalactone the drydown', () => {
    const fig = { stemone: 24, 'gamma-octalactone': 56, 'cedarwood-virginia': 20 };
    expect(leader(fig, OPENING)).toBe('stemone');
    expect(leader(fig, DRYDOWN)).toBe('gamma-octalactone');
  });

  it('Stemone is far stronger than octalactone: still leads at 30:70', () => {
    expect(leader({ stemone: 30, 'gamma-octalactone': 70 }, OPENING)).toBe('stemone');
  });

  it('PEA × decalactone ladder: rose at 90:10, peach by 60:40', () => {
    expect(leader({ 'phenylethyl-alcohol': 90, 'gamma-decalactone': 10 }, OPENING)).toBe('phenylethyl-alcohol');
    expect(leader({ 'phenylethyl-alcohol': 60, 'gamma-decalactone': 40 }, OPENING)).toBe('gamma-decalactone');
  });

  it('loudness starts at 1 and fades', () => {
    const [opening, heart, dry] = profile(amberBase);
    expect(opening.loudness).toBe(1);
    expect(heart.loudness).toBeLessThan(1);
    expect(dry.loudness).toBeLessThan(heart.loudness);
  });

  it('handles an empty formula', () => {
    expect(profile({}).every((s) => s.shares.length === 0 && s.loudness === 0)).toBe(true);
  });
});
