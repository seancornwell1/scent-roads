import { describe, expect, it } from 'vitest';
import { recognizeAccords } from './accords';
import { content, materialsById } from './content';
import type { Formula } from './types';

const names = (formula: Formula) => recognizeAccords(formula, content.accords, materialsById).map((a) => a.id);

describe('accord recognition', () => {
  it("recognizes Sean's amber base and Amber 70/30", () => {
    expect(names({ vanillin: 35, labdanum: 35, bergamot: 30 })).toEqual(['amber']);
    expect(names({ labdanum: 43, bergamot: 26, vanillin: 18, hedione: 13 })).toEqual(['amber']);
  });

  it('does not call the fig accord anything', () => {
    expect(names({ stemone: 24, 'gamma-octalactone': 56, 'cedarwood-virginia': 20 })).toEqual([]);
  });

  it('recognizes a chypre skeleton', () => {
    expect(names({ bergamot: 30, labdanum: 10, oakmoss: 5, patchouli: 10, hedione: 20 })).toContain('chypre');
  });

  it('recognizes a fougère, which needs oakmoss', () => {
    const hicky = { bergamot: 30, lavender: 30, vanillin: 37, coumarin: 3 };
    expect(names(hicky)).not.toContain('fougere');
    expect(names({ ...hicky, oakmoss: 3 })).toContain('fougere');
  });

  it('recognizes a cologne, but not with a heavy base', () => {
    expect(names({ bergamot: 60, lavender: 15, dihydromyrcenol: 10, 'pink-pepper': 5, hedione: 10 })).toEqual(['cologne']);
    expect(names({ bergamot: 50, lavender: 10, vanillin: 40 })).not.toContain('cologne');
  });

  it('recognizes nothing in an empty formula', () => {
    expect(names({})).toEqual([]);
  });
});

describe('amber threshold', () => {
  it('needs real labdanum, not a trace', () => {
    expect(names({ vanillin: 35, labdanum: 5 })).not.toContain('amber');
  });
});
