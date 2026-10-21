import { analyticsKeys } from '@/features/analytics/keys';
import { inventoryKeys } from '@/features/inventory/keys';
import type { ManualProduct, ManualProductInput } from './types';
import { type OrderableRecipe } from '@/features/orders/types';
import { recipesKeys } from '@/features/recipes/keys';
import {
  type BarcodePrice,
  type BarcodePriceInput,
  type Recipe,
  type RecipeUpdate,
} from '@/features/recipes/types';
import { documentFetch as apiFetch } from '@/features/sync/documentsApi';
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
        old
          ? {
              recipe: {
                ...old.recipe,
                status: data.recipe.status ?? 'verified',
              },
            }
          : old,
      );
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({
        queryKey: recipesKeys.recipes(shopId),
      });
      void queryClient.invalidateQueries({
        queryKey: recipesKeys.orderableRecipes(shopId),
      });
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
      void queryClient.invalidateQueries({
        queryKey: recipesKeys.recipes(shopId),
      });
      void queryClient.invalidateQueries({
        queryKey: recipesKeys.orderableRecipes(shopId),
      });
      void queryClient.invalidateQueries({
        queryKey: analyticsKeys.dashboardRoot,
      });
    },
  });
}

export function useUpdateRecipe(token: Token, shopId: ShopId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RecipeUpdate }) =>
      apiFetch<{ recipe: Omit<Recipe, 'costing'> }>(`/recipes/${id}`, {
        method: 'PATCH',
        token,
        shopId,
        body,
      }),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({
        queryKey: recipesKeys.recipe(shopId, id),
      });
      void queryClient.invalidateQueries({
        queryKey: recipesKeys.recipes(shopId),
      });
      void queryClient.invalidateQueries({
        queryKey: recipesKeys.orderableRecipes(shopId),
      });
      void queryClient.invalidateQueries({
        queryKey: analyticsKeys.dashboardRoot,
      });
    },
  });
}

export function useBarcodePrice(token: Token, shopId: ShopId) {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: BarcodePriceInput }) =>
      apiFetch<{ price: BarcodePrice }>(`/recipes/${id}/barcode-price`, {
        method: 'POST',
        token,
        shopId,
        body,
      }),
  });
}

export function useManualProduct(token: Token, shopId: ShopId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ManualProductInput }) =>
      apiFetch<{ product: ManualProduct }>(`/recipes/${id}/manual-product`, {
        method: 'POST',
        token,
        shopId,
        body,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: inventoryKeys.inventory(shopId),
      });
    },
  });
}
