import { analyticsKeys } from '@/features/analytics/keys';
import { ordersKeys } from '@/features/orders/keys';
import type { StatusFilter } from '@/features/orders/types';
import { type Order, type OrderDetail, type OrderQuote } from '@/features/orders/types';
import { documentFetch as apiFetch } from '@/features/sync/documentsApi';
import type { ShopId, UserId } from '@/lib/queryTypes';
import { enabled } from '@/lib/queryTypes';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

export function useOrders(
  userId: UserId,
  shopId: ShopId,
  statusFilter: StatusFilter,
): UseQueryResult<{ orders: Order[]; total: number }> {
  return useQuery({
    queryKey: ordersKeys.orders(shopId, statusFilter),
    queryFn: ({ signal }) =>
      apiFetch<{ orders: Order[]; total: number }>(
        statusFilter === 'all' ? '/orders?limit=100' : `/orders?limit=100&status=${statusFilter}`,
        { userId, shopId, signal },
      ),
    enabled: enabled(userId, shopId),
  });
}

export function useOrder(
  userId: UserId,
  shopId: ShopId,
  id: string,
): UseQueryResult<{ order: OrderDetail }> {
  return useQuery({
    queryKey: ordersKeys.order(shopId, id),
    queryFn: ({ signal }) =>
      apiFetch<{ order: OrderDetail }>(`/orders/${id}`, { userId, shopId, signal }),
    enabled: enabled(userId, shopId) && Boolean(id),
  });
}

export function useOrderQuote(
  userId: UserId,
  shopId: ShopId,
  inputs: { items: { recipeId: string; quantity: number }[]; distanceKm: number; enabled: boolean },
): UseQueryResult<OrderQuote> {
  return useQuery({
    queryKey: ['order-quote', shopId, JSON.stringify(inputs.items), inputs.distanceKm],
    queryFn: ({ signal }) =>
      apiFetch<OrderQuote>('/orders/quote', {
        method: 'POST',
        userId,
        shopId,
        signal,
        body: { deliveryDistanceKm: inputs.distanceKm, items: inputs.items },
      }),
    enabled: enabled(userId, shopId) && inputs.enabled && inputs.items.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useCreateOrder(
  userId: UserId,
  shopId: ShopId,
): UseMutationResult<{ order: Order; totals: { netProfit: number } }, Error, CreateOrderBody> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOrderBody) =>
      apiFetch<{ order: Order; totals: { netProfit: number } }>('/orders', {
        method: 'POST',
        userId,
        shopId,
        body,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ordersKeys.ordersRoot });
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.dashboardRoot });
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
  userId: UserId,
  shopId: ShopId,
): UseMutationResult<{ order: OrderDetail }, Error, { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) =>
      apiFetch<{ order: OrderDetail }>(`/orders/${id}/verify`, {
        method: 'POST',
        userId,
        shopId,
      }),
    onSuccess: (data, { id }) => {
      const key = ordersKeys.order(shopId, id);
      // The transition response carries the order row without its items, so
      // only the status is taken; the refetch brings back the full detail.
      queryClient.setQueryData<{ order: OrderDetail }>(key, (old) =>
        old ? { order: { ...old.order, status: data.order.status } } : old,
      );
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: ordersKeys.ordersRoot });
    },
  });
}

export function useDeleteOrder(
  userId: UserId,
  shopId: ShopId,
): UseMutationResult<undefined, Error, { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) =>
      apiFetch<undefined>(`/orders/${id}`, { method: 'DELETE', userId, shopId }),
    onSuccess: (_data, { id }) => {
      queryClient.removeQueries({ queryKey: ordersKeys.order(shopId, id) });
      void queryClient.invalidateQueries({ queryKey: ordersKeys.ordersRoot });
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.dashboardRoot });
    },
  });
}
