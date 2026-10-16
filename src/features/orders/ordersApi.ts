import { analyticsKeys } from '@/features/analytics/keys';
import { ordersKeys } from '@/features/orders/keys';
import type { StatusFilter } from '@/features/orders/types';
import { type Order, type OrderDetail, type OrderQuote } from '@/features/orders/types';
import { apiFetch } from '@/lib/api';
import type { ShopId, Token } from '@/lib/queryTypes';
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
  token: Token,
  shopId: ShopId,
  statusFilter: StatusFilter,
): UseQueryResult<{ orders: Order[]; total: number }> {
  return useQuery({
    queryKey: ordersKeys.orders(shopId, statusFilter),
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
    queryKey: ordersKeys.order(shopId, id),
    queryFn: ({ signal }) =>
      apiFetch<{ order: OrderDetail }>(`/orders/${id}`, { token, shopId, signal }),
    enabled: enabled(token, shopId) && Boolean(id),
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
  token: Token,
  shopId: ShopId,
): UseMutationResult<{ order: OrderDetail }, Error, { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) =>
      apiFetch<{ order: OrderDetail }>(`/orders/${id}/verify`, {
        method: 'POST',
        token,
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
  token: Token,
  shopId: ShopId,
): UseMutationResult<undefined, Error, { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) =>
      apiFetch<undefined>(`/orders/${id}`, { method: 'DELETE', token, shopId }),
    onSuccess: (_data, { id }) => {
      queryClient.removeQueries({ queryKey: ordersKeys.order(shopId, id) });
      void queryClient.invalidateQueries({ queryKey: ordersKeys.ordersRoot });
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.dashboardRoot });
    },
  });
}
