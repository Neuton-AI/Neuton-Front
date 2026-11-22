import { recipeOrderPricing } from '@/features/recipes/selectors';
import type { Recipe } from '@/features/recipes/types';
import type { OrderDetailItem } from '@/features/orders/types';

export type NewSelection = {
  recipeId: string;
  quantity: number;
  baselineUnitPrice: string;
  lastKnownRecipe: Recipe;
};
type SavedSelection = {
  recipeId: string;
  quantity: number;
  savedLine: OrderDetailItem;
};
export type Selection = NewSelection | SavedSelection;
export type DraftLine = {
  recipeId: string;
  lineId?: string;
  quantity: number;
  name: string;
  imageUrl: string | null;
  unitPrice: string;
  unitCost: string;
  costComplete: boolean;
  available: boolean;
  pricingPending: boolean;
  reason: string | null;
};

export const selectionKey = (line: Selection) => 'savedLine' in line ? line.savedLine.id : line.recipeId;

export function eligibleRecipe(recipe: Recipe): boolean {
  return recipe.isActive && recipe.status === 'verified';
}

export function changeSelection(selections: readonly Selection[], recipe: Recipe, delta: number): Selection[] {
  const existing = selections.find(line => line.recipeId === recipe.id);
  if (existing && 'savedLine' in existing) {
    return changeSavedSelection(selections, existing.savedLine.id, delta);
  }
  const quantity = Math.max(0, (existing?.quantity ?? 0) + delta);
  if (!Number.isInteger(quantity) || quantity > 100000) return [...selections];
  if (quantity === 0) return selections.filter(line => line.recipeId !== recipe.id);
  const pricing = recipeOrderPricing(recipe).orderPricing;
  if (!eligibleRecipe(recipe) || !pricing) return [...selections];
  if (existing) {
    return selections.map(line => line.recipeId === recipe.id ? { ...line, quantity } : line);
  }
  if (selections.length >= 100) return [...selections];
  return [...selections, { recipeId: recipe.id, quantity, baselineUnitPrice: pricing.unitPrice, lastKnownRecipe: recipe }];
}

export function changeSavedSelection(selections: readonly Selection[], id: string, delta: number): Selection[] {
  return selections.flatMap(line => {
    if (!('savedLine' in line) || line.savedLine.id !== id) return [line];
    const quantity = Math.round((line.quantity + delta) * 1000) / 1000;
    if (quantity <= 0) return [];
    if (delta > 0 && quantity > 100000) return [line];
    return [{ ...line, quantity }];
  });
}

export function projectDraft(selections: readonly Selection[], catalog: readonly Recipe[]) {
  const byId = new Map(catalog.map(recipe => [recipe.id, recipe]));
  const priceDiffByRecipeId: Record<string, { name: string; old: number; new: number }> = {};
  const lines: DraftLine[] = selections.map(selection => {
    const current = byId.get(selection.recipeId);
    if ('savedLine' in selection) {
      const { savedLine } = selection;
      return {
        lineId: savedLine.id, recipeId: selection.recipeId, quantity: selection.quantity,
        name: savedLine.name, imageUrl: current?.imageUrl ?? null, unitPrice: savedLine.unitPrice,
        unitCost: savedLine.unitCost, costComplete: savedLine.costComplete !== false,
        available: true, pricingPending: false, reason: null,
      };
    }
    const recipe = current ?? selection.lastKnownRecipe;
    const currentPricing = recipeOrderPricing(recipe).orderPricing;
    const previousPricing = recipeOrderPricing(selection.lastKnownRecipe).orderPricing;
    const pricing = currentPricing ?? previousPricing;
    const pricingPending = Boolean(current && eligibleRecipe(current) && !currentPricing);
    const available = Boolean(current && eligibleRecipe(current) && pricing);
    const unitPrice = pricing?.unitPrice ?? selection.baselineUnitPrice;
    if (available && !pricingPending && unitPrice !== selection.baselineUnitPrice) {
      priceDiffByRecipeId[selection.recipeId] = {
        name: recipe.name, old: Number(selection.baselineUnitPrice), new: Number(unitPrice),
      };
    }
    let reason: string | null = null;
    if (!current) reason = 'NOT_FOUND';
    else if (!current.isActive) reason = 'INACTIVE';
    else if (current.status !== 'verified') reason = 'UNVERIFIED';
    else if (pricingPending) reason = 'PRICING_UNAVAILABLE';
    return {
      recipeId: selection.recipeId, quantity: selection.quantity, name: recipe.name,
      imageUrl: recipe.imageUrl, unitPrice, unitCost: pricing?.unitCost ?? '0.0000',
      costComplete: pricing?.costComplete ?? false, available, pricingPending, reason,
    };
  });
  const availableLines = lines.filter(line => line.available);
  const subtotalCents = availableLines.reduce((sum, line) => sum + Math.round(Number(line.unitPrice) * 100) * line.quantity, 0);
  return {
    lines, priceDiffByRecipeId,
    subtotal: subtotalCents / 100,
    selectedCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    availableCount: availableLines.length,
    unavailableIds: lines.filter(line => !line.available).map(line => line.recipeId),
  };
}
