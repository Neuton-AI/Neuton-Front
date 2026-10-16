import { buildRecipe } from '@/test/factories/recipes.factory';
import { describe, expect, it } from 'vitest';
import { ingredientLinkSummary } from './selectors';
describe('ingredientLinkSummary', () => {
  it('recognizes supermarket prices without optional server flags', () => {
    const { costing } = buildRecipe();
    costing.ingredients[0] = {
      ...costing.ingredients[0]!,
      generalPriceId: 'price-1',
      inventoryItemId: null,
    };
    expect(ingredientLinkSummary(costing)).toEqual({ linked: 1, total: 1, incomplete: false });
  });
  it('honors explicit unlinked flags over IDs', () => {
    const { costing } = buildRecipe();
    costing.ingredients[0] = {
      ...costing.ingredients[0]!,
      linked: false,
      inventoryItemId: 'stock-1',
    };
    expect(ingredientLinkSummary(costing).incomplete).toBe(true);
  });
  it('honors server counts over fallback ingredient data', () => {
    const { costing } = buildRecipe();
    expect(ingredientLinkSummary({ ...costing, linkedCount: 2, totalCount: 3 })).toEqual({
      linked: 2,
      total: 3,
      incomplete: true,
    });
  });
});
