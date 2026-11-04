import { analyticsKeys } from '@/features/analytics/keys';
import type {
  ManualProduct,
  ManualProductInput,
  ManualProductUsage,
} from './types';
import { type OrderableRecipe } from '@/features/orders/types';
import { recipesKeys } from '@/features/recipes/keys';
import {
  type BarcodePrice,
  type BarcodePriceInput,
  type Recipe,
  type RecipeUpdate,
} from '@/features/recipes/types';
import { documentFetch as apiFetch } from '@/features/sync/documentsApi';
import type { ShopId, AuthenticatedContext } from '@/lib/queryTypes';
import { enabled } from '@/lib/queryTypes';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

export function useRecipes(
  identity: AuthenticatedContext,
  shopId: ShopId,
  active = true,
): UseQueryResult<{ recipes: Recipe[] }> {
  return useQuery({
    queryKey: recipesKeys.recipes(shopId),
    queryFn: ({ signal }) =>
      apiFetch<{ recipes: Recipe[] }>('/recipes?includeUnverified=true', {
        identity,
        shopId,
        signal,
      }),
    enabled: enabled(identity, shopId) && active,
  });
}

export function useRecipe(
  identity: AuthenticatedContext,
  shopId: ShopId,
  id: string,
): UseQueryResult<{ recipe: Recipe }> {
  return useQuery({
    queryKey: recipesKeys.recipe(shopId, id),
    queryFn: ({ signal }) =>
      apiFetch<{ recipe: Recipe }>(`/recipes/${id}`, {
        identity,
        shopId,
        signal,
      }),
    enabled: enabled(identity, shopId) && Boolean(id),
  });
}

export function useOrderableRecipes(
  identity: AuthenticatedContext,
  shopId: ShopId,
): UseQueryResult<{ recipes: OrderableRecipe[] }> {
  return useQuery({
    queryKey: recipesKeys.orderableRecipes(shopId),
    queryFn: ({ signal }) =>
      apiFetch<{ recipes: OrderableRecipe[] }>('/recipes/orderable', {
        identity,
        shopId,
        signal,
      }),
    enabled: enabled(identity, shopId),
  });
}

export function useVerifyRecipe(
  identity: AuthenticatedContext,
  shopId: ShopId,
): UseMutationResult<{ recipe: Recipe }, Error, { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) =>
      apiFetch<{ recipe: Recipe }>(`/recipes/${id}/verify`, {
        method: 'POST',
        identity,
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
  identity: AuthenticatedContext,
  shopId: ShopId,
): UseMutationResult<
  { ok: true; mode: 'hard' | 'soft' },
  Error,
  { id: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) =>
      apiFetch<{ ok: true; mode: 'hard' | 'soft' }>(`/recipes/${id}`, {
        method: 'DELETE',
        identity,
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

export function useUpdateRecipe(
  identity: AuthenticatedContext,
  shopId: ShopId,
) {
  const queryClient = useQueryClient();
  return useMutation({
    // documentFetch saves to IndexedDB first; its sync engine owns network retries.
    networkMode: 'always',
    mutationFn: ({ id, body }: { id: string; body: RecipeUpdate }) =>
      apiFetch<{ recipe: Omit<Recipe, 'costing'> }>(`/recipes/${id}`, {
        method: 'PATCH',
        identity,
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

export function useBarcodePrice(
  identity: AuthenticatedContext,
  shopId: ShopId,
) {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: BarcodePriceInput }) =>
      apiFetch<{ price: BarcodePrice }>(`/recipes/${id}/barcode-price`, {
        method: 'POST',
        identity,
        shopId,
        body,
      }),
  });
}

export function useManualProduct(
  identity: AuthenticatedContext,
  shopId: ShopId,
) {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ManualProductInput }) =>
      apiFetch<{ product: ManualProduct; usage: ManualProductUsage }>(
        `/recipes/${id}/manual-product`,
        {
          method: 'POST',
          identity,
          shopId,
          body,
        },
      ),
  });
}
