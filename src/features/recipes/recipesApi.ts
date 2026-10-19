import { analyticsKeys } from '@/features/analytics/keys';
import { type OrderableRecipe } from '@/features/orders/types';
import { recipesKeys } from '@/features/recipes/keys';
import { type Recipe, type RecipeCosting } from '@/features/recipes/types';
import { apiFetch } from '@/lib/api';
import type { ShopId, Token } from '@/lib/queryTypes';
import { enabled } from '@/lib/queryTypes';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

export function useRecipes(
  token: Token,
  shopId: ShopId,
  active = true,
): UseQueryResult<{ recipes: Recipe[] }> {
  return useQuery({
    queryKey: recipesKeys.recipes(shopId),
    queryFn: ({ signal }) =>
      apiFetch<{ recipes: Recipe[] }>('/recipes?includeUnverified=true', {
        token,
        shopId,
        signal,
      }),
    enabled: enabled(token, shopId) && active,
    refetchInterval: (query) => {
      const recipes = query.state.data?.recipes ?? [];
      const processing = recipes.some(
        (recipe) => recipe.status === 'pending' || recipe.status === 'processing',
      );
      return processing ? 3000 : false;
    },
  });
}

export function useRecipe(
  token: Token,
  shopId: ShopId,
  id: string,
): UseQueryResult<{ recipe: Recipe }> {
  return useQuery({
    queryKey: recipesKeys.recipe(shopId, id),
    queryFn: ({ signal }) =>
      apiFetch<{ recipe: Recipe }>(`/recipes/${id}`, { token, shopId, signal }),
    enabled: enabled(token, shopId) && Boolean(id),
    // The worker keeps writing extraction rows while a recipe is pending, so
    // poll only in that window and stop the moment it lands anywhere else.
    refetchInterval: (query) => {
      const status = query.state.data?.recipe.status;
      return status === 'pending' || status === 'processing' ? 3000 : false;
    },
  });
}

export function useOrderableRecipes(
  token: Token,
  shopId: ShopId,
): UseQueryResult<{ recipes: OrderableRecipe[] }> {
  return useQuery({
    queryKey: recipesKeys.orderableRecipes(shopId),
    queryFn: ({ signal }) =>
      apiFetch<{ recipes: OrderableRecipe[] }>('/recipes/orderable', {
        token,
        shopId,
        signal,
      }),
    enabled: enabled(token, shopId),
  });
}

export function useVerifyRecipe(
  token: Token,
  shopId: ShopId,
): UseMutationResult<{ recipe: Recipe }, Error, { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) =>
      apiFetch<{ recipe: Recipe }>(`/recipes/${id}/verify`, {
        method: 'POST',
        token,
        shopId,
        // Every field of the body is optional, but the endpoint still parses an
        // object — a bodyless POST comes back as a 400.
        body: {},
      }),
    onSuccess: (data, { id }) => {
      const key = recipesKeys.recipe(shopId, id);
      queryClient.setQueryData<{ recipe: Recipe }>(key, (old) =>
        old ? { recipe: { ...old.recipe, status: data.recipe.status ?? 'verified' } } : old,
      );
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: recipesKeys.recipes(shopId) });
      void queryClient.invalidateQueries({ queryKey: recipesKeys.orderableRecipes(shopId) });
    },
  });
}

/**
 * Fields PATCHable by the edit screen. The server recomputes base-unit columns
 * from `rawSrcUnit`/`quantity`, so `baseUnit`/`baseUnitAmount` must never
 * travel here — the ingredients array is a full replace, minimum one row.
 */
export type UpdateRecipeFields = {
  name?: string;
  prepTimeMinutes?: number;
  yieldQuantity?: number;
  allergens?: string[];
  steps?: { stepNumber: number; instruction: string }[];
  ingredients?: {
    inventoryItemId?: string | null;
    generalPriceId?: string | null;
    rawName: string;
    rawMaterialName?: string;
    quantity: number;
    rawSrcUnit: string;
  }[];
};

export function useUpdateRecipe(
  token: Token,
  shopId: ShopId,
): UseMutationResult<{ recipe: Recipe }, Error, { id: string; fields: UpdateRecipeFields }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }) =>
      apiFetch<{ recipe: Recipe }>(`/recipes/${id}`, {
        method: 'PATCH',
        token,
        shopId,
        body: fields,
      }),
    // The response is the recipe row without costing, so the merge keeps the
    // costing the detail query already holds until the invalidation refetches.
    onSuccess: (data, { id }) => {
      const key = recipesKeys.recipe(shopId, id);
      queryClient.setQueryData<{ recipe: Recipe }>(key, (old) =>
        old ? { recipe: { ...old.recipe, ...data.recipe } } : old,
      );
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: recipesKeys.recipes(shopId) });
    },
  });
}

export function useLinkIngredient(
  token: Token,
  shopId: ShopId,
  recipeId: string,
  ingredientId: string,
): UseMutationResult<{ costing: RecipeCosting }, Error, { barcode: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    // Keyed per ingredient so the edit screen can show exactly which row's
    // camera button is mid-link (useMutationState filters on this prefix).
    mutationKey: ['linkIngredient', recipeId, ingredientId],
    mutationFn: ({ barcode }) =>
      apiFetch<{ costing: RecipeCosting }>(
        `/recipes/${recipeId}/ingredients/${ingredientId}/link`,
        { method: 'POST', token, shopId, body: { barcode } },
      ),
    // The response only carries the costing, so the recipe detail is refetched
    // to pick up the linked ingredient (the row's linked indicator reads from it).
    onSuccess: (data) => {
      const key = recipesKeys.recipe(shopId, recipeId);
      queryClient.setQueryData<{ recipe: Recipe }>(key, (old) =>
        old ? { recipe: { ...old.recipe, costing: data.costing } } : old,
      );
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: recipesKeys.recipes(shopId) });
    },
  });
}

export function useDeleteRecipe(
  token: Token,
  shopId: ShopId,
): UseMutationResult<{ ok: true; mode: 'hard' | 'soft' }, Error, { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) =>
      apiFetch<{ ok: true; mode: 'hard' | 'soft' }>(`/recipes/${id}`, {
        method: 'DELETE',
        token,
        shopId,
      }),
    onSuccess: (_data, { id }) => {
      queryClient.removeQueries({ queryKey: recipesKeys.recipe(shopId, id) });
      void queryClient.invalidateQueries({ queryKey: recipesKeys.recipes(shopId) });
      void queryClient.invalidateQueries({ queryKey: recipesKeys.orderableRecipes(shopId) });
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.dashboardRoot });
    },
  });
}
