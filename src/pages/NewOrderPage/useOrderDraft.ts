import { useEffect, useState } from 'react';
import { useRecipes } from '@/features/recipes/recipesApi';
import { recipeOrderPricing } from '@/features/recipes/selectors';
import type { Recipe } from '@/features/recipes/types';
import type { OrderReviewDetails } from '@/features/orders/types';
import type { ShopId, UserId } from '@/lib/queryTypes';
import { changeSelection, eligibleRecipe, projectDraft, type Selection } from './orderDraft';
import { reconcileOverlay, reviewOverlay, reviewedCatalog, type ReviewOverlay } from './orderDraftReview';

type DraftState = { scope: string; catalog: Recipe[]; selections: Selection[]; overlay: ReviewOverlay };
const emptyDraft = (scope: string): DraftState => ({ scope, catalog: [], selections: [], overlay: {} });

/** In-memory selections survive failed local reads; only successful catalogs establish absence. */
export function useOrderDraft(userId: UserId, shopId: ShopId) {
  const scope = JSON.stringify([userId, shopId]);
  const query = useRecipes(userId, shopId);
  const [state, setState] = useState(() => emptyDraft(scope));
  if (state.scope !== scope) {
    setState(emptyDraft(scope));
  }
  const current = state.scope === scope ? state : emptyDraft(scope);
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
      const latest = reviewedCatalog(previous.catalog, previous.overlay).find(item => item.id === recipe.id);
      if (!latest) return previous;
      const selections = changeSelection(previous.selections, latest, delta);
      return { ...previous, selections };
    });
  };
  const remove = (recipeId: string) => {
    setState(previous => {
      if (previous.scope !== scope) return previous;
      return { ...previous, selections: previous.selections.filter(line => line.recipeId !== recipeId) };
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
    recipes: catalog.filter(eligibleRecipe),
    loading: query.isLoading,
    error: query.error,
    revision: JSON.stringify([scope, current.selections, catalog]),
    clear: () => setState(previous => previous.scope === scope ? { ...previous, selections: [], overlay: {} } : previous),
    quantityOf: (id: string) => current.selections.find(line => line.recipeId === id)?.quantity ?? 0,
  };
}
