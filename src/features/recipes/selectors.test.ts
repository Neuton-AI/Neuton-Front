import { buildRecipe } from '@/test/factories/recipes.factory';
import { describe, expect, it } from 'vitest';
import { ingredientLinkSummary, recipeOrderPricing } from './selectors';
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

describe('recipeOrderPricing', () => {
  it('uses the synced projection without changing partial-cost truth', () => {
    const recipe = buildRecipe();
    recipe.orderPricing = { unitPrice: '0.00', unitCost: '0.0000', costComplete: false };
    recipe.costing.costComplete = false;
    const before = structuredClone(recipe);
    expect(recipeOrderPricing(recipe)).toEqual({ orderPricing: recipe.orderPricing, orderPricingError: null });
    expect(recipe).toEqual(before);
  });

  it('preserves a legacy complete retail price and four-decimal known cost', () => {
    expect(recipeOrderPricing(buildRecipe())).toEqual({
      orderPricing: { unitPrice: '10.50', unitCost: '2.1000', costComplete: true },
      orderPricingError: null,
    });
  });

  it('derives a missing partial projection from known ingredients plus labor, with server rounding', () => {
    const recipe = buildRecipe({ yieldQuantity: '3' });
    Object.assign(recipe.costing, {
      costComplete: false, unitCost: null, retailPrice: null, batchCost: null,
      ingredientsCost: 1, laborCost: 9,
    });
    expect(recipeOrderPricing(recipe)).toEqual({
      orderPricing: { unitPrice: '3.33', unitCost: '3.3333', costComplete: false },
      orderPricingError: null,
    });
    recipe.costing.ingredientsCost = 0;
    recipe.costing.laborCost = 0;
    expect(recipeOrderPricing(recipe).orderPricing?.unitPrice).toBe('0.00');
  });

  it('retains server errors instead of falling back to older costs', () => {
    const recipe = buildRecipe({
      orderPricing: null,
      orderPricingError: { code: 'INVALID_RECIPE_YIELD', message: 'Invalid yield' },
    });
    expect(recipeOrderPricing(recipe)).toEqual({ orderPricing: null, orderPricingError: recipe.orderPricingError });
  });

  it.each(['0', '-2', '', 'invalid'])('returns a recoverable error for legacy yield %s', (yieldQuantity) => {
    const result = recipeOrderPricing(buildRecipe({ yieldQuantity }));
    expect(result.orderPricing).toBeNull();
    expect(result.orderPricingError?.code).toBe('INVALID_RECIPE_YIELD');
  });

  it('does not fabricate a zero price when known costs are missing or invalid', () => {
    const recipe = buildRecipe();
    Object.assign(recipe.costing, { costComplete: false, retailPrice: null, unitCost: null, ingredientsCost: undefined });
    expect(recipeOrderPricing(recipe).orderPricing).toBeNull();
    expect(recipeOrderPricing(recipe).orderPricingError?.code).toBe('ORDER_PRICING_UNAVAILABLE');
  });
});
