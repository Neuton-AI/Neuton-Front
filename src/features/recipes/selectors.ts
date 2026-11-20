import type { Recipe, RecipeCosting, RecipeIngredient, RecipeOrderPricingResult } from './types';
export function ingredientLinkSummary(costing: RecipeCosting) {
  const total = costing.totalCount ?? costing.ingredients.length;
  const linked =
    costing.linkedCount ?? costing.ingredients.filter((i) => ingredientIsLinked(i)).length;
  return { total, linked, incomplete: costing.costComplete === false || total === 0 || linked < total };
}

export function ingredientIsLinked(ingredient: Pick<RecipeIngredient, 'linked' | 'inventoryItemId' | 'generalPriceId'>): boolean {
  return (
    ingredient.linked ?? (ingredient.inventoryItemId != null || ingredient.generalPriceId != null)
  );
}

/** Read current server pricing, or derive the documented legacy snapshot fallback. */
export function recipeOrderPricing(recipe: Recipe): RecipeOrderPricingResult {
  if (recipe.orderPricingError) {
    return { orderPricing: null, orderPricingError: recipe.orderPricingError };
  }
  if (recipe.orderPricing) {
    return { orderPricing: recipe.orderPricing, orderPricingError: null };
  }
  const unavailable: RecipeOrderPricingResult = {
    orderPricing: null,
    orderPricingError: { code: 'ORDER_PRICING_UNAVAILABLE', message: 'Recipe pricing requires a synced costing snapshot' },
  };
  if (recipe.orderPricing === null || !recipe.costing) return unavailable;
  const yieldQuantity = Number(recipe.yieldQuantity);
  if (!Number.isFinite(yieldQuantity) || yieldQuantity <= 0) {
    return {
      orderPricing: null,
      orderPricingError: { code: 'INVALID_RECIPE_YIELD', message: 'Recipe yield must be a finite positive number' },
    };
  }
  const { costing } = recipe;
  if (costing.costComplete !== false && costing.retailPrice !== null && costing.unitCost !== null &&
    Number.isFinite(costing.retailPrice) && costing.retailPrice >= 0 &&
    Number.isFinite(costing.unitCost) && costing.unitCost >= 0) {
    return {
      orderPricing: {
        unitPrice: roundPrice(costing.retailPrice, 2),
        unitCost: roundPrice(costing.unitCost, 4),
        costComplete: true,
      },
      orderPricingError: null,
    };
  }
  if (costing.costComplete === true ||
    !Number.isFinite(costing.ingredientsCost) || costing.ingredientsCost < 0 ||
    !Number.isFinite(costing.laborCost) || costing.laborCost < 0) {
    return unavailable;
  }
  const knownUnitCost = Number(roundPrice((costing.ingredientsCost + costing.laborCost) / yieldQuantity, 4));
  return {
    orderPricing: { unitPrice: roundPrice(knownUnitCost, 2), unitCost: roundPrice(knownUnitCost, 4), costComplete: false },
    orderPricingError: null,
  };
}

/** Match the server's EPSILON rounding before formatting either price precision. */
function roundPrice(value: number, decimals: number): string {
  const factor = 10 ** decimals;
  return (Math.round((value + Number.EPSILON) * factor) / factor).toFixed(decimals);
}
