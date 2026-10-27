import { describe, expect, it } from 'vitest';
import { blend, isBalanced } from './blend';
import { STARTER_INGREDIENTS } from './ingredients';

describe('blend', () => {
  it('sorts ingredients into tiers', () => {
    const b = blend(STARTER_INGREDIENTS);
    expect(b.top.map((i) => i.id)).toEqual(['bergamot']);
    expect(b.heart.map((i) => i.id)).toEqual(['rose']);
    expect(b.base.map((i) => i.id)).toEqual(['sandalwood']);
  });

  it('is balanced only when every tier is filled', () => {
    expect(isBalanced(blend(STARTER_INGREDIENTS))).toBe(true);
    expect(isBalanced(blend(STARTER_INGREDIENTS.slice(0, 2)))).toBe(false);
  });
});
