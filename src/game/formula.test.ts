import { describe, expect, it } from 'vitest';
import { addParts, percentages, totalParts } from './formula';

describe('formula', () => {
  it('adds and removes parts, dropping materials at zero', () => {
    let f = addParts({}, 'vanillin', 1);
    f = addParts(f, 'vanillin', 0.5);
    expect(f).toEqual({ vanillin: 1.5 });
    expect(addParts(f, 'vanillin', -5)).toEqual({});
  });

  it('avoids floating-point drift', () => {
    let f = {};
    for (let i = 0; i < 3; i++) f = addParts(f, 'x', 0.1);
    expect(f).toEqual({ x: 0.3 });
  });

  it('computes totals and percentages', () => {
    const f = { a: 30, b: 10 };
    expect(totalParts(f)).toBe(40);
    expect(percentages(f)).toEqual({ a: 75, b: 25 });
  });
});
