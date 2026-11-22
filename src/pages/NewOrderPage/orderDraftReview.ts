import type { OrderReviewDetails } from '@/features/orders/types';
import type { Recipe } from '@/features/recipes/types';
import { recipeOrderPricing } from '@/features/recipes/selectors';
import { eligibleRecipe, type Selection } from './orderDraft';

type Correction = { recipe: Recipe | null; basedOnVersion?: number };
export type ReviewOverlay = Record<string, Correction>;

export function reviewOverlay(selections: readonly Selection[], details: OrderReviewDetails, catalog: readonly Recipe[]): ReviewOverlay {
  const overlay: ReviewOverlay = {};
  for (const selection of selections) {
    if ('savedLine' in selection) continue;
    const basedOnVersion = catalog.find(recipe => recipe.id === selection.recipeId)?.localServerVersion;
    const correction = details.currentItems.find(item => item.recipeId === selection.recipeId);
    if (correction) {
      const previous = selection.lastKnownRecipe;
      const unitCost = recipeOrderPricing(previous).orderPricing?.unitCost ?? '0.0000';
      overlay[selection.recipeId] = { basedOnVersion, recipe: {
        ...previous, name: correction.name, isActive: true, status: 'verified',
        orderPricingError: null,
        orderPricing: { unitPrice: correction.unitPrice, unitCost, costComplete: correction.costComplete },
      } };
    } else {
      const unavailable = details.unavailable.find(item => item.recipeId === selection.recipeId);
      if (unavailable?.reason === 'NOT_FOUND') overlay[selection.recipeId] = { basedOnVersion, recipe: null };
      else if (unavailable?.reason === 'INACTIVE') {
        overlay[selection.recipeId] = { basedOnVersion, recipe: { ...selection.lastKnownRecipe, isActive: false } };
      } else if (unavailable?.reason === 'UNVERIFIED') {
        overlay[selection.recipeId] = { basedOnVersion, recipe: { ...selection.lastKnownRecipe, status: 'unverified' } };
      }
    }
  }
  return overlay;
}

export function reconcileOverlay(overlay: ReviewOverlay, catalog: readonly Recipe[]): ReviewOverlay {
  const retained: ReviewOverlay = {};
  for (const [id, entry] of Object.entries(overlay)) {
    const local = catalog.find(recipe => recipe.id === id);
    const version = local?.localServerVersion;
    if (version !== undefined && (entry.basedOnVersion === undefined || version > entry.basedOnVersion)) continue;
    const correction = entry.recipe;
    if (correction === null) {
      if (local && eligibleRecipe(local)) retained[id] = entry;
      continue;
    }
    if (!eligibleRecipe(correction)) {
      if (!local || local.isActive !== correction.isActive || local.status !== correction.status) retained[id] = entry;
      continue;
    }
    const localPrice = local && recipeOrderPricing(local).orderPricing;
    const equivalent = local && eligibleRecipe(local) && localPrice &&
      local.name === correction.name && localPrice.unitPrice === correction.orderPricing?.unitPrice &&
      localPrice.costComplete === correction.orderPricing.costComplete;
    if (!equivalent) retained[id] = entry;
  }
  return retained;
}

export function reviewedCatalog(catalog: readonly Recipe[], overlay: ReviewOverlay): Recipe[] {
  const byId = new Map(catalog.map(recipe => [recipe.id, recipe]));
  for (const [id, correction] of Object.entries(overlay)) {
    if (correction.recipe) byId.set(id, correction.recipe);
    else byId.delete(id);
  }
  return [...byId.values()];
}
