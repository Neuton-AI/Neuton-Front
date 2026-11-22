import { analyticsKeys } from '@/features/analytics/keys';
import { ordersKeys } from '@/features/orders/keys';
import type { OrderEditSnapshot, ReviewedCreateOrderBody, StatusFilter, UpdateOrderBody } from '@/features/orders/types';
import { type Order, type OrderDetail } from '@/features/orders/types';
import { apiFetch as onlineFetch, requestScopeSignal } from '@/lib/api';
import { changed, result, transaction } from '@/features/sync/store';
import { syncDocuments } from '@/features/sync/engine';
import { documentKey, scopeFor, type LocalDocument } from '@/features/sync/types';
import { documentFetch as apiFetch } from '@/features/sync/documentsApi';
import type { ShopId, UserId } from '@/lib/queryTypes';
import { enabled } from '@/lib/queryTypes';
import {
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

export function useCreateOrder(
  userId: UserId,
  shopId: ShopId,
): UseMutationResult<{ order: Order; totals: { netProfit: number } }, Error, ReviewedCreateOrderBody> {
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    networkMode: 'always',
    mutationFn: (body: ReviewedCreateOrderBody) =>
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

export function useOrderForEdit(userId: UserId, shopId: ShopId, id: string, canEdit: boolean) {
  return useQuery({
    queryKey: ['order-for-edit', userId, shopId, id],
    queryFn: ({ signal }) => onlineFetch<OrderEditSnapshot>(`/orders/${id}`, {
      userId, shopId, signal, syncSnapshot: true,
    }),
    enabled: canEdit && enabled(userId, shopId) && Boolean(id),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    networkMode: 'always',
    retry: false,
    refetchOnMount: 'always',
  });
}

export function useUpdateOrder(userId: UserId, shopId: ShopId) {
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    networkMode: 'always',
    mutationFn: async ({ id, baseVersion, body, mutationId, version }: {
      id: string; baseVersion: number; body: UpdateOrderBody; mutationId: string; version: number;
    }) => {
      const scope = scopeFor(userId, shopId);
      const signal = requestScopeSignal(userId, shopId);
      const snapshot = await onlineFetch<OrderEditSnapshot>(`/orders/${id}`, {
        method: 'PATCH', userId, shopId, signal, body,
        sync: { id: mutationId, updatedAt: version, baseVersion },
      });
      const key = documentKey(scope, 'order', id);
      try {
        const accepted = await transaction(['documents'], async tx => {
          const docs = tx.objectStore('documents');
          const current = await result<LocalDocument | undefined>(docs.get(key));
          signal?.throwIfAborted();
          if (current && (current.syncStatus === 'pending-push' || current.updatedAt > snapshot.syncVersion)) {
            return false;
          }
          docs.put({
            key, scope: scope.key, kind: 'order', id, deleted: false,
            updatedAt: snapshot.syncVersion, serverVersion: snapshot.syncVersion,
            serverData: snapshot.order, data: snapshot.order, syncStatus: 'synced',
            lastSyncedAt: Date.now(),
          } satisfies LocalDocument);
          return true;
        });
        signal?.throwIfAborted();
        if (accepted) {
          queryClient.setQueryData(ordersKeys.order(shopId, id), { order: snapshot.order });
          changed();
        }
      } catch {
        if (!signal?.aborted) {
          queryClient.setQueryData(ordersKeys.order(shopId, id), { order: snapshot.order });
          void syncDocuments(scope, { userId, shopId }, { force: true, queueIfRunning: true }).catch(() => undefined);
        }
      }
      return snapshot;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ordersKeys.ordersRoot });
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.dashboardRoot });
    },
  });
}

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
