import {
  sameQueryPartition,
  identityQueryKey,
} from '@/features/auth/environment';
import { analyticsKeys } from '@/features/analytics/keys';
import { ordersKeys } from '@/features/orders/keys';
import type { StatusFilter } from '@/features/orders/types';
import {
  type Order,
  type OrderDetail,
  type OrderQuote,
} from '@/features/orders/types';
import { documentFetch as apiFetch } from '@/features/sync/documentsApi';
import type { ShopId, AuthenticatedContext } from '@/lib/queryTypes';
import { enabled, networkEnabled } from '@/lib/queryTypes';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

export function useOrders(
  identity: AuthenticatedContext,
  shopId: ShopId,
  statusFilter: StatusFilter,
): UseQueryResult<{ orders: Order[]; total: number }> {
  return useQuery({
    networkMode: 'always',
    queryKey: ordersKeys.orders(identity, shopId, statusFilter),
    queryFn: ({ signal }) =>
      apiFetch<{ orders: Order[]; total: number }>(
        statusFilter === 'all'
          ? '/orders?limit=100'
          : `/orders?limit=100&status=${statusFilter}`,
        { identity, shopId, signal },
      ),
    enabled: enabled(identity, shopId),
  });
}

export function useOrder(
  identity: AuthenticatedContext,
  shopId: ShopId,
  id: string,
): UseQueryResult<{ order: OrderDetail }> {
  return useQuery({
    networkMode: 'always',
    queryKey: ordersKeys.order(identity, shopId, id),
    queryFn: ({ signal }) =>
      apiFetch<{ order: OrderDetail }>(`/orders/${id}`, {
        identity,
        shopId,
        signal,
      }),
    enabled: enabled(identity, shopId) && Boolean(id),
  });
}

export function useOrderQuote(
  identity: AuthenticatedContext,
  shopId: ShopId,
  inputs: {
    items: { recipeId: string; quantity: number }[];
    distanceKm: number;
    enabled: boolean;
  },
): UseQueryResult<OrderQuote> {
  return useQuery({
    networkMode: 'always',
    queryKey: identityQueryKey(
      identity,
      'order-quote',
      shopId,
      JSON.stringify(inputs.items),
      inputs.distanceKm,
    ),
    queryFn: ({ signal }) =>
      apiFetch<OrderQuote>('/orders/quote', {
        method: 'POST',
        identity,
        shopId,
        signal,
        body: { deliveryDistanceKm: inputs.distanceKm, items: inputs.items },
      }),
    enabled:
      networkEnabled(identity, shopId) &&
      inputs.enabled &&
      inputs.items.length > 0,
    placeholderData: (previous, query) =>
      sameQueryPartition(query?.queryKey, identity, shopId)
        ? previous
        : undefined,
  });
}

export function useCreateOrder(
  identity: AuthenticatedContext,
  shopId: ShopId,
): UseMutationResult<
  { order: Order; totals: { netProfit: number } },
  Error,
  CreateOrderBody
> {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: (body: CreateOrderBody) =>
      apiFetch<{ order: Order; totals: { netProfit: number } }>('/orders', {
        method: 'POST',
        identity,
        shopId,
        body,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ordersKeys.ordersRoot(identity),
      });
      void queryClient.invalidateQueries({
        queryKey: analyticsKeys.dashboardRoot(identity),
      });
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
  identity: AuthenticatedContext,
  shopId: ShopId,
): UseMutationResult<{ order: OrderDetail }, Error, { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({ id }) =>
      apiFetch<{ order: OrderDetail }>(`/orders/${id}/verify`, {
        method: 'POST',
        identity,
        shopId,
      }),
    onSuccess: (data, { id }) => {
      const key = ordersKeys.order(identity, shopId, id);
      // The transition response carries the order row without its items, so
      // only the status is taken; the refetch brings back the full detail.
      queryClient.setQueryData<{ order: OrderDetail }>(key, (old) =>
        old ? { order: { ...old.order, status: data.order.status } } : old,
      );
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({
        queryKey: ordersKeys.ordersRoot(identity),
      });
    },
  });
}

export function useDeleteOrder(
  identity: AuthenticatedContext,
  shopId: ShopId,
): UseMutationResult<undefined, Error, { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({ id }) =>
      apiFetch<undefined>(`/orders/${id}`, {
        method: 'DELETE',
        identity,
        shopId,
      }),
    onSuccess: (_data, { id }) => {
      queryClient.removeQueries({
        queryKey: ordersKeys.order(identity, shopId, id),
      });
      void queryClient.invalidateQueries({
        queryKey: ordersKeys.ordersRoot(identity),
      });
      void queryClient.invalidateQueries({
        queryKey: analyticsKeys.dashboardRoot(identity),
      });
    },
  });
}
