import type { RecipeCosting, RecipeIngredient } from './types';
export function ingredientLinkSummary(costing: RecipeCosting) {
  const total = costing.totalCount ?? costing.ingredients.length;
  const linked =
    costing.linkedCount ?? costing.ingredients.filter((i) => ingredientIsLinked(i)).length;
  return { total, linked, incomplete: costing.costComplete === false || total === 0 || linked < total };
}

export function ingredientIsLinked(ingredient: RecipeIngredient): boolean {
  return (
    ingredient.linked ?? (ingredient.inventoryItemId != null || ingredient.generalPriceId != null)
  );
}
