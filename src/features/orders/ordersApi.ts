import { analyticsKeys } from '@/features/analytics/keys';
import { ordersKeys } from '@/features/orders/keys';
import type { CancelOrderBody, CancelOrderResult, OrderEditSnapshot, RecordPaymentBody, ReviewedCreateOrderBody, StatusFilter, UpdateOrderBody } from '@/features/orders/types';
import { type Order, type OrderDetail } from '@/features/orders/types';
import { apiFetch as onlineFetch, requestScopeSignal } from '@/lib/api';
import { changed, result, transaction } from '@/features/sync/store';
import { syncDocuments } from '@/features/sync/engine';
import { documentKey, scopeFor, type LocalDocument, type PendingWrite } from '@/features/sync/types';
import { documentFetch as apiFetch } from '@/features/sync/documentsApi';
import type { ShopId, UserId } from '@/lib/queryTypes';
import { enabled } from '@/lib/queryTypes';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
  type QueryClient,
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
  return useOrderSnapshotMutation<UpdateOrderBody>(userId, shopId, 'PATCH', '');
}

export function useUndoOrderDelivery(userId: UserId, shopId: ShopId) {
  return useOrderSnapshotMutation<{ confirmedMarkedByMistake: true }>(userId, shopId, 'POST', '/undo-delivery');
}

export function useRecordOrderPayment(userId: UserId, shopId: ShopId) {
  return useOrderSnapshotMutation<RecordPaymentBody>(userId, shopId, 'POST', '/payments');
}

export function useCancelOrder(userId: UserId, shopId: ShopId) {
  return useOrderSnapshotMutation<CancelOrderBody, CancelOrderResult>(userId, shopId, 'POST', '/cancel');
}

async function cacheOrderVersion(queryClient: QueryClient, userId: UserId, shopId: ShopId,
  id: string, version: number, order: OrderDetail | null, signal?: AbortSignal) {
  const scope = scopeFor(userId, shopId);
  const key = documentKey(scope, 'order', id);
  const queryKey = ordersKeys.order(shopId, id);
  const data = order ?? { id };
  const updateQuery = () => {
    if (order) queryClient.setQueryData(queryKey, { order });
    else queryClient.removeQueries({ queryKey, exact: true });
  };
  try {
    const accepted = await transaction(['documents', 'writes'], async tx => {
      const docs = tx.objectStore('documents');
      const current = await result<LocalDocument | undefined>(docs.get(key));
      signal?.throwIfAborted();
      if (order && current && (current.deleted || current.syncStatus === 'pending-push' || current.updatedAt > version)) {
        return false;
      }
      if (!order) {
        const writes = tx.objectStore('writes');
        const pending = await result<PendingWrite[]>(writes.index('scope').getAll(scope.key));
        signal?.throwIfAborted();
        for (const write of pending) {
          if (write.documentKey === key) writes.delete(write.key);
        }
      }
      docs.put({ key, scope: scope.key, kind: 'order', id, deleted: !order,
        updatedAt: version, serverVersion: version, serverData: data, data, syncStatus: 'synced',
        lastSyncedAt: Date.now() } satisfies LocalDocument);
      return true;
    });
    signal?.throwIfAborted();
    if (accepted) {
      updateQuery();
      changed();
    }
  } catch {
    if (!signal?.aborted) {
      updateQuery();
      void syncDocuments(scope, { userId, shopId }, { force: true, queueIfRunning: true }).catch(() => undefined);
    }
  }
}

export function useCacheOrderSnapshot(userId: UserId, shopId: ShopId) {
  const client = useQueryClient();
  return (snapshot: OrderEditSnapshot) => cacheOrderVersion(client, userId, shopId, snapshot.order.id,
    snapshot.syncVersion, snapshot.order, requestScopeSignal(userId, shopId));
}

function useOrderSnapshotMutation<Body, Result extends OrderEditSnapshot | CancelOrderResult = OrderEditSnapshot>(
  userId: UserId, shopId: ShopId, method: 'PATCH' | 'POST', action: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    networkMode: 'always',
    mutationFn: async ({ id, baseVersion, body, mutationId, version }: {
      id: string; baseVersion: number; body: Body; mutationId: string; version: number;
    }) => {
      const signal = requestScopeSignal(userId, shopId);
      const snapshot = await onlineFetch<Result>(`/orders/${id}${action}`, {
        method, userId, shopId, signal, body,
        sync: { id: mutationId, updatedAt: version, baseVersion },
      });
      if ('order' in snapshot) await cacheOrderVersion(queryClient, userId, shopId, id, snapshot.syncVersion, snapshot.order, signal);
      else await cacheOrderVersion(queryClient, userId, shopId, id, version, null, signal);
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
