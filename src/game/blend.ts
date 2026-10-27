import type { Ingredient, NoteTier } from './ingredients';

export interface Blend {
  top: Ingredient[];
  heart: Ingredient[];
  base: Ingredient[];
}

export function blend(ingredients: readonly Ingredient[]): Blend {
  const result: Blend = { top: [], heart: [], base: [] };
  for (const ingredient of ingredients) result[ingredient.tier].push(ingredient);
  return result;
}

/** A blend is balanced when every tier has at least one note. */
export function isBalanced(b: Blend): boolean {
  const tiers: NoteTier[] = ['top', 'heart', 'base'];
  return tiers.every((tier) => b[tier].length > 0);
}
