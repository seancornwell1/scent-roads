// Fragrance notes evaporate in tiers: top notes first, base notes last.
export type NoteTier = 'top' | 'heart' | 'base';

export interface Ingredient {
  id: string;
  name: string;
  tier: NoteTier;
  /** Free-form scent family, e.g. "citrus", "floral", "woody". */
  family: string;
}

export const STARTER_INGREDIENTS: readonly Ingredient[] = [
  { id: 'bergamot', name: 'Bergamot', tier: 'top', family: 'citrus' },
  { id: 'rose', name: 'Rose', tier: 'heart', family: 'floral' },
  { id: 'sandalwood', name: 'Sandalwood', tier: 'base', family: 'woody' },
];
