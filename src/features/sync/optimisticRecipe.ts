import type { Recipe, RecipeUpdate } from '@/features/recipes/types';
import type { DocumentData } from './types';

/** Reflect parsed ingredient edits immediately; let the server recalculate prices. */
export function optimisticRecipe(
  data: DocumentData,
  body: Record<string, unknown>,
): DocumentData {
  const recipe = data as unknown as Recipe;
  const update = body as Partial<RecipeUpdate>;
  const next = { ...data, ...body };
  if (!recipe.costing) return next;
  const previous = recipe.costing.ingredients;
  const ingredientsChanged =
    update.ingredients &&
    (update.ingredients.length !== previous.length ||
      update.ingredients.some((item, index) => {
        const old = previous[index];
        return (
          !old ||
          item.rawName !== (old.rawName ?? old.name) ||
          item.quantity !== Number(old.quantity) ||
          item.rawSrcUnit !== old.rawSrcUnit ||
          item.inventoryItemId !== (old.inventoryItemId ?? null) ||
          item.generalPriceId !== (old.generalPriceId ?? null)
        );
      }));
  const costChanged =
    ingredientsChanged ||
    (update.prepTimeMinutes !== undefined &&
      update.prepTimeMinutes !== recipe.prepTimeMinutes) ||
    (update.yieldQuantity !== undefined &&
      update.yieldQuantity !== Number(recipe.yieldQuantity));
  if (!costChanged) return next;
  return {
    ...next,
    costing: {
      ...recipe.costing,
      costComplete: false,
      unitCost: null,
      batchCost: null,
      retailPrice: null,
      inStock: false,
      linkedCount: update.ingredients?.filter((item) => item.inventoryItemId || item.generalPriceId).length ?? recipe.costing.linkedCount,
      totalCount: update.ingredients?.length ?? recipe.costing.totalCount,
      ingredients:
        update.ingredients?.map((item) => ({
          ...item,
          name: item.rawName,
          averageUnitCost: null,
          lineCost: null,
          currentQuantity: 0,
          linked: Boolean(item.inventoryItemId || item.generalPriceId),
        })) ?? previous,
    },
  };
}
