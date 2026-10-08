/**
 * Typed TanStack Query hooks wrapping the `apiFetch` client.
 *
 * Every server read goes through `useQuery`, every write through `useMutation`.
 * The cache keys are the contract the mutations invalidate against:
 *
 * - `['dashboard', shopId, period]` — analytics window, plus the
 *   `['dashboard']` root every write that changes money invalidates.
 * - `['recipes', shopId]`, `['recipes', 'orderable', shopId]`, `['recipe', shopId, id]`
 * - `['inventory', shopId]`
 * - `['receipts', shopId]`, `['receipt', shopId, id]`
 * - `['orders', shopId, statusFilter]`, `['order', shopId, id]`
 * - `['shop', shopId]`
 *
 * Queries stay disabled until both a token and an active shop exist, so an
 * unauthenticated mount never fires a request that can only 401.
 */

import { useEffect, useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  apiFetch,
  type DashboardPeriod,
  type DashboardSummary,
  type InventoryItem,
  type Order,
  type OrderDetail,
  type OrderQuote,
  type OrderableRecipe,
  type OrderStatus,
  type Receipt,
  type ReceiptDetail,
  type Recipe,
  type Shop,
  type VerifyReceiptBody,
  type VerifyReceiptOutcome,
} from './api';

type Token = string | null | undefined;
type ShopId = string | null | undefined;

type StatusFilter = 'all' | OrderStatus;

export const queryKeys = {
  dashboard: (shopId: ShopId, period: DashboardPeriod) => ['dashboard', shopId, period] as const,
  dashboardRoot: ['dashboard'] as const,
  recipes: (shopId: ShopId) => ['recipes', shopId] as const,
  orderableRecipes: (shopId: ShopId) => ['recipes', 'orderable', shopId] as const,
  inventory: (shopId: ShopId) => ['inventory', shopId] as const,
  receipts: (shopId: ShopId) => ['receipts', shopId] as const,
  orders: (shopId: ShopId, status: StatusFilter) => ['orders', shopId, status] as const,
  ordersRoot: ['orders'] as const,
  order: (shopId: ShopId, id: string) => ['order', shopId, id] as const,
  recipe: (shopId: ShopId, id: string) => ['recipe', shopId, id] as const,
  receipt: (shopId: ShopId, id: string) => ['receipt', shopId, id] as const,
  shop: (shopId: ShopId) => ['shop', shopId] as const,
  signedDownloadUrl: (shopId: ShopId, storagePath: string) =>
    ['signed-download-url', shopId, storagePath] as const,
};

const enabled = (token: Token, shopId: ShopId) => Boolean(token && shopId);

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export function useDashboardSummary(
  token: Token,
  shopId: ShopId,
  period: DashboardPeriod,
): UseQueryResult<DashboardSummary> {
  return useQuery({
    queryKey: queryKeys.dashboard(shopId, period),
    queryFn: ({ signal }) =>
      apiFetch<DashboardSummary>(`/analytics/dashboard?period=${period}`, {
        token,
        shopId,
        signal,
      }),
    enabled: enabled(token, shopId),
    // Keep the previous period on screen while the next one loads, so a tab
    // switch never flashes the chart empty.
    placeholderData: keepPreviousData,
  });
}

/** Extracted recipes; polls every 3s while the worker is still reading one. */
export function useRecipes(
  token: Token,
  shopId: ShopId,
  active = true,
): UseQueryResult<{ recipes: Recipe[] }> {
  return useQuery({
    queryKey: queryKeys.recipes(shopId),
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

export function useInventory(
  token: Token,
  shopId: ShopId,
  active = true,
): UseQueryResult<{ items: InventoryItem[] }> {
  return useQuery({
    queryKey: queryKeys.inventory(shopId),
    queryFn: ({ signal }) =>
      apiFetch<{ items: InventoryItem[] }>('/inventory', { token, shopId, signal }),
    enabled: enabled(token, shopId) && active,
  });
}

export function useReceipts(
  token: Token,
  shopId: ShopId,
  active = true,
): UseQueryResult<{ receipts: Receipt[] }> {
  return useQuery({
    queryKey: queryKeys.receipts(shopId),
    queryFn: ({ signal }) =>
      apiFetch<{ receipts: Receipt[] }>('/receipts?limit=50', { token, shopId, signal }),
    enabled: enabled(token, shopId) && active,
  });
}

export function useOrders(
  token: Token,
  shopId: ShopId,
  statusFilter: StatusFilter,
): UseQueryResult<{ orders: Order[]; total: number }> {
  return useQuery({
    queryKey: queryKeys.orders(shopId, statusFilter),
    queryFn: ({ signal }) =>
      apiFetch<{ orders: Order[]; total: number }>(
        statusFilter === 'all' ? '/orders?limit=100' : `/orders?limit=100&status=${statusFilter}`,
        { token, shopId, signal },
      ),
    enabled: enabled(token, shopId),
  });
}

export function useOrder(
  token: Token,
  shopId: ShopId,
  id: string,
): UseQueryResult<{ order: OrderDetail }> {
  return useQuery({
    queryKey: queryKeys.order(shopId, id),
    queryFn: ({ signal }) =>
      apiFetch<{ order: OrderDetail }>(`/orders/${id}`, { token, shopId, signal }),
    enabled: enabled(token, shopId) && Boolean(id),
  });
}

export function useRecipe(
  token: Token,
  shopId: ShopId,
  id: string,
): UseQueryResult<{ recipe: Recipe }> {
  return useQuery({
    queryKey: queryKeys.recipe(shopId, id),
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

export function useReceipt(
  token: Token,
  shopId: ShopId,
  id: string,
): UseQueryResult<{ receipt: ReceiptDetail }> {
  return useQuery({
    queryKey: queryKeys.receipt(shopId, id),
    queryFn: ({ signal }) =>
      apiFetch<{ receipt: ReceiptDetail }>(`/receipts/${id}`, { token, shopId, signal }),
    enabled: enabled(token, shopId) && Boolean(id),
    // Only a receipt the worker is still chewing on gains lines asynchronously.
    // `unverified` hands over to a human, so polling it would just spin.
    refetchInterval: (query) =>
      query.state.data?.receipt.status === 'processing' ? 3000 : false,
  });
}

export function useOrderableRecipes(
  token: Token,
  shopId: ShopId,
): UseQueryResult<{ recipes: OrderableRecipe[] }> {
  return useQuery({
    queryKey: queryKeys.orderableRecipes(shopId),
    queryFn: ({ signal }) =>
      apiFetch<{ recipes: OrderableRecipe[] }>('/recipes/orderable', {
        token,
        shopId,
        signal,
      }),
    enabled: enabled(token, shopId),
  });
}

export function useOrderQuote(
  token: Token,
  shopId: ShopId,
  inputs: { items: { recipeId: string; quantity: number }[]; distanceKm: number; enabled: boolean },
): UseQueryResult<OrderQuote> {
  return useQuery({
    queryKey: ['order-quote', shopId, JSON.stringify(inputs.items), inputs.distanceKm],
    queryFn: ({ signal }) =>
      apiFetch<OrderQuote>('/orders/quote', {
        method: 'POST',
        token,
        shopId,
        signal,
        body: { deliveryDistanceKm: inputs.distanceKm, items: inputs.items },
      }),
    enabled: enabled(token, shopId) && inputs.enabled && inputs.items.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useShopSettings(
  token: Token,
  shopId: ShopId,
): UseQueryResult<{ shop: Shop }> {
  return useQuery({
    queryKey: queryKeys.shop(shopId),
    queryFn: ({ signal }) => apiFetch<{ shop: Shop }>('/shop', { token, shopId, signal }),
    enabled: enabled(token, shopId),
  });
}

/** Signs a short-lived read URL for a private storage object. */
export function useSignedDownloadUrl(
  token: Token,
  shopId: ShopId,
  storagePath: string,
): UseQueryResult<{ url: string; expiresIn: number }> {
  return useQuery({
    queryKey: queryKeys.signedDownloadUrl(shopId, storagePath),
    queryFn: ({ signal }) =>
      apiFetch<{ url: string; expiresIn: number }>('/uploads/download-url', {
        method: 'POST',
        token,
        shopId,
        signal,
        body: { path: storagePath },
      }),
    enabled: enabled(token, shopId) && Boolean(storagePath),
  });
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

export function useCreateOrder(
  token: Token,
  shopId: ShopId,
): UseMutationResult<{ order: Order; totals: { netProfit: number } }, Error, CreateOrderBody> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOrderBody) =>
      apiFetch<{ order: Order; totals: { netProfit: number } }>('/orders', {
        method: 'POST',
        token,
        shopId,
        body,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ordersRoot });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardRoot });
    },
  });
}

export type CreateOrderBody = {
  customerName: string | null;
  orderDate: string;
  destinationAddress: string | null;
  deliveryDistanceKm: number;
  items: { recipeId: string; quantity: number }[];
};

export function useMarkOrderDelivered(
  token: Token,
  shopId: ShopId,
): UseMutationResult<{ order: OrderDetail }, Error, { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) =>
      apiFetch<{ order: OrderDetail }>(`/orders/${id}/status`, {
        method: 'PATCH',
        token,
        shopId,
        body: { status: 'delivered' },
      }),
    onSuccess: (data, { id }) => {
      const key = queryKeys.order(shopId, id);
      // The transition response carries the order row without its items, so
      // only the status is taken; the refetch brings back the full detail.
      queryClient.setQueryData<{ order: OrderDetail }>(key, (old) =>
        old ? { order: { ...old.order, status: data.order.status } } : old,
      );
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ordersRoot });
    },
  });
}

export function useDeleteOrder(
  token: Token,
  shopId: ShopId,
): UseMutationResult<undefined, Error, { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) =>
      apiFetch<undefined>(`/orders/${id}`, { method: 'DELETE', token, shopId }),
    onSuccess: (_data, { id }) => {
      queryClient.removeQueries({ queryKey: queryKeys.order(shopId, id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ordersRoot });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardRoot });
    },
  });
}

export function useVerifyRecipe(
  token: Token,
  shopId: ShopId,
): UseMutationResult<{ recipe: Recipe }, Error, { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) =>
      apiFetch<{ recipe: Recipe }>(`/catalog/recipe/${id}/verify`, {
        method: 'POST',
        token,
        shopId,
        // Every field of the body is optional, but the endpoint still parses an
        // object — a bodyless POST comes back as a 400.
        body: {},
      }),
    onSuccess: (data, { id }) => {
      const key = queryKeys.recipe(shopId, id);
      queryClient.setQueryData<{ recipe: Recipe }>(key, (old) =>
        old ? { recipe: { ...old.recipe, status: data.recipe.status ?? 'verified' } } : old,
      );
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.recipes(shopId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orderableRecipes(shopId) });
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
      queryClient.removeQueries({ queryKey: queryKeys.recipe(shopId, id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.recipes(shopId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orderableRecipes(shopId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardRoot });
    },
  });
}

export function useVerifyReceipt(
  token: Token,
  shopId: ShopId,
): UseMutationResult<VerifyReceiptOutcome, Error, { id: string; body: VerifyReceiptBody }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) =>
      apiFetch<VerifyReceiptOutcome>(`/catalog/receipt/${id}/verify`, {
        method: 'POST',
        token,
        shopId,
        body,
      }),
    onSuccess: (data, { id }) => {
      const key = queryKeys.receipt(shopId, id);
      queryClient.setQueryData<{ receipt: ReceiptDetail }>(key, (old) =>
        old ? { receipt: { ...old.receipt, status: data.status } } : old,
      );
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.receipts(shopId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory(shopId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardRoot });
    },
  });
}

export function useDeleteReceipt(
  token: Token,
  shopId: ShopId,
): UseMutationResult<{ ok: true }, Error, { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => apiFetch<{ ok: true }>(`/receipts/${id}`, { method: 'DELETE', token, shopId }),
    onSuccess: (_data, { id }) => {
      queryClient.removeQueries({ queryKey: queryKeys.receipt(shopId, id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.receipts(shopId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory(shopId) });
    },
  });
}

export type UpdateShopBody = {
  storeAddress: string | null;
  targetProfitMargin: number;
  hourlyLaborCost: number;
  deliveryBaseFee: number;
  deliveryRatePerKm: number;
};

export function useUpdateShop(
  token: Token,
  shopId: ShopId,
): UseMutationResult<{ shop: Shop }, Error, UpdateShopBody> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateShopBody) =>
      apiFetch<{ shop: Shop }>('/shop', { method: 'PATCH', token, shopId, body }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.shop(shopId), data);
    },
  });
}

export function useCreateShop(token: Token): UseMutationResult<{ shop: Shop }, Error, string> {
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<{ shop: Shop }>('/shops', { method: 'POST', token, body: { name } }),
  });
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Delays a rapidly changing value. The order form prices through a POST on
 * every keystroke of distance / every quantity change; debouncing the inputs
 * that build the query key lets TanStack Query fire one request, not ten.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
