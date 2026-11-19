import type { OrderReviewDetails } from '@/features/orders/types';
import type { Recipe } from '@/features/recipes/types';
import { recipeOrderPricing } from '@/features/recipes/selectors';
import { eligibleRecipe, type Selection } from './orderDraft';

export type ReviewOverlay = Record<string, Recipe | null>;

export function reviewOverlay(selections: readonly Selection[], details: OrderReviewDetails): ReviewOverlay {
  const overlay: ReviewOverlay = {};
  for (const selection of selections) {
    const correction = details.currentItems.find(item => item.recipeId === selection.recipeId);
    if (correction) {
      const previous = selection.lastKnownRecipe;
      const unitCost = recipeOrderPricing(previous).orderPricing?.unitCost ?? '0.0000';
      overlay[selection.recipeId] = {
        ...previous, name: correction.name, isActive: true, status: 'verified',
        orderPricingError: null,
        orderPricing: { unitPrice: correction.unitPrice, unitCost, costComplete: correction.costComplete },
      };
    } else {
      const unavailable = details.unavailable.find(item => item.recipeId === selection.recipeId);
      if (unavailable?.reason === 'NOT_FOUND') overlay[selection.recipeId] = null;
      else if (unavailable?.reason === 'INACTIVE') {
        overlay[selection.recipeId] = { ...selection.lastKnownRecipe, isActive: false };
      } else if (unavailable?.reason === 'UNVERIFIED') {
        overlay[selection.recipeId] = { ...selection.lastKnownRecipe, status: 'unverified' };
      }
    }
  }
  return overlay;
}

export function reconcileOverlay(overlay: ReviewOverlay, catalog: readonly Recipe[]): ReviewOverlay {
  const retained: ReviewOverlay = {};
  for (const [id, correction] of Object.entries(overlay)) {
    const local = catalog.find(recipe => recipe.id === id);
    if (correction === null) {
      if (local && eligibleRecipe(local)) retained[id] = null;
      continue;
    }
    if (!eligibleRecipe(correction)) {
      if (!local || local.isActive !== correction.isActive || local.status !== correction.status) retained[id] = correction;
      continue;
    }
    const localPrice = local && recipeOrderPricing(local).orderPricing;
    const equivalent = local && eligibleRecipe(local) && localPrice &&
      local.name === correction.name && localPrice.unitPrice === correction.orderPricing?.unitPrice &&
      localPrice.costComplete === correction.orderPricing.costComplete;
    if (!equivalent) retained[id] = correction;
  }
  return retained;
}

export function reviewedCatalog(catalog: readonly Recipe[], overlay: ReviewOverlay): Recipe[] {
  const byId = new Map(catalog.map(recipe => [recipe.id, recipe]));
  for (const [id, correction] of Object.entries(overlay)) {
    if (correction) byId.set(id, correction);
    else byId.delete(id);
  }
  return [...byId.values()];
}
