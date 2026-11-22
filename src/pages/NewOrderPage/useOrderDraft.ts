import { useEffect, useState } from 'react';
import { useRecipes } from '@/features/recipes/recipesApi';
import { recipeOrderPricing } from '@/features/recipes/selectors';
import type { Recipe } from '@/features/recipes/types';
import type { OrderDetail, OrderReviewDetails } from '@/features/orders/types';
import type { ShopId, UserId } from '@/lib/queryTypes';
import { changeSavedSelection, changeSelection, eligibleRecipe, projectDraft, selectionKey, type Selection } from './orderDraft';
import { reconcileOverlay, reviewOverlay, reviewedCatalog, type ReviewOverlay } from './orderDraftReview';

type DraftState = { scope: string; catalog: Recipe[]; selections: Selection[]; overlay: ReviewOverlay };
const initialDraft = (scope: string, order?: OrderDetail): DraftState => ({
  scope, catalog: [], overlay: {},
  selections: order?.items.map(savedLine => ({
    savedLine, recipeId: savedLine.recipeId, quantity: Number(savedLine.quantity),
  })) ?? [],
});

/** In-memory selections survive failed local reads; only successful catalogs establish absence. */
export function useOrderDraft(userId: UserId, shopId: ShopId, order?: OrderDetail) {
  const scope = JSON.stringify([userId, shopId, order?.id]);
  const query = useRecipes(userId, shopId);
  const [state, setState] = useState(() => initialDraft(scope, order));
  if (state.scope !== scope) {
    setState(initialDraft(scope, order));
  }
  const current = state.scope === scope ? state : initialDraft(scope, order);
  const data = query.data;
  const success = query.isSuccess;
  useEffect(() => {
    if (!success || !data || !userId || !shopId) return;
    const catalog = data.recipes.filter(recipe => recipe.shopId === shopId);
    setState(previous => {
      if (previous.scope !== scope) return previous;
      const overlay = reconcileOverlay(previous.overlay, catalog);
      const effective = reviewedCatalog(catalog, overlay);
      const selections = previous.selections.map(selection => {
        if ('savedLine' in selection) return selection;
        const recipe = effective.find(item => item.id === selection.recipeId);
        if (!recipe) return selection;
        if (!recipeOrderPricing(recipe).orderPricing) {
          return { ...selection, lastKnownRecipe: { ...selection.lastKnownRecipe, name: recipe.name, imageUrl: recipe.imageUrl } };
        }
        return { ...selection, lastKnownRecipe: recipe };
      });
      return { ...previous, catalog, selections, overlay };
    });
  }, [data, success, userId, shopId, scope]);

  const catalog = reviewedCatalog(current.catalog, current.overlay);
  const draft = projectDraft(current.selections, catalog);
  const changeQuantity = (recipe: Pick<Recipe, 'id'>, delta: number) => {
    setState(previous => {
      if (previous.scope !== scope) return previous;
      if (previous.selections.some(line => 'savedLine' in line && line.savedLine.id === recipe.id)) {
        return { ...previous, selections: changeSavedSelection(previous.selections, recipe.id, delta) };
      }
      const latest = reviewedCatalog(previous.catalog, previous.overlay).find(item => item.id === recipe.id);
      if (!latest) return previous;
      const selections = changeSelection(previous.selections, latest, delta);
      return { ...previous, selections };
    });
  };
  const remove = (id: string) => {
    setState(previous => {
      if (previous.scope !== scope) return previous;
      return { ...previous, selections: previous.selections.filter(line => selectionKey(line) !== id) };
    });
  };
  const applyReview = (details: OrderReviewDetails) => {
    setState(previous => {
      if (previous.scope !== scope) return previous;
      const overlay = { ...previous.overlay, ...reviewOverlay(previous.selections, details, previous.catalog) };
      return { ...previous, overlay };
    });
  };
  return {
    ...draft, changeQuantity, remove, applyReview,
    itemsDirty: order ? JSON.stringify(draft.lines.map(line => [line.lineId, line.quantity])) !==
      JSON.stringify(order.items.map(line => [line.id, Number(line.quantity)])) : draft.lines.length > 0,
    recipes: catalog.filter(eligibleRecipe),
    loading: query.isLoading,
    error: query.error,
    revision: JSON.stringify([scope, current.selections, catalog]),
    clear: () => setState(previous => previous.scope === scope ? { ...previous, selections: [], overlay: {} } : previous),
    quantityOf: (id: string) => current.selections.find(line => line.recipeId === id)?.quantity ?? 0,
  };
}
