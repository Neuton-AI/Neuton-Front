import { isApiIdentityCurrent } from '@/lib/api-context';
import { analyticsKeys } from '@/features/analytics/keys';
import { inventoryKeys } from '@/features/inventory/keys';
import { receiptsKeys } from '@/features/receipts/keys';
import {
  type Receipt,
  type ReceiptDetail,
  type VerifyReceiptBody,
  type VerifyReceiptOutcome,
} from '@/features/receipts/types';
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

export function useReceipts(
  identity: AuthenticatedContext,
  shopId: ShopId,
  active = true,
): UseQueryResult<{ receipts: Receipt[] }> {
  return useQuery({
    networkMode: 'always',
    queryKey: receiptsKeys.receipts(identity, shopId),
    queryFn: ({ signal }) =>
      apiFetch<{ receipts: Receipt[] }>('/receipts?limit=50', {
        identity,
        shopId,
        signal,
      }),
    enabled: enabled(identity, shopId) && active,
  });
}

export function useReceipt(
  identity: AuthenticatedContext,
  shopId: ShopId,
  id: string,
): UseQueryResult<{ receipt: ReceiptDetail }> {
  return useQuery({
    networkMode: 'always',
    queryKey: receiptsKeys.receipt(identity, shopId, id),
    queryFn: ({ signal }) =>
      apiFetch<{ receipt: ReceiptDetail }>(`/receipts/${id}`, {
        identity,
        shopId,
        signal,
      }),
    enabled: enabled(identity, shopId) && Boolean(id),
    // The shop event stream refreshes processing and review states alike.
  });
}

export function useVerifyReceipt(
  identity: AuthenticatedContext,
  shopId: ShopId,
): UseMutationResult<
  VerifyReceiptOutcome,
  Error,
  { id: string; body: VerifyReceiptBody }
> {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({ id, body }) =>
      apiFetch<VerifyReceiptOutcome>(`/receipts/${id}/verify`, {
        method: 'POST',
        identity,
        shopId,
        body,
      }),
    onSuccess: (data, { id }) => {
      if (!isApiIdentityCurrent(identity, shopId)) return;
      const key = receiptsKeys.receipt(identity, shopId, id);
      queryClient.setQueryData<{ receipt: ReceiptDetail }>(key, (old) =>
        old ? { receipt: { ...old.receipt, status: data.status } } : old,
      );
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({
        queryKey: receiptsKeys.receipts(identity, shopId),
      });
      void queryClient.invalidateQueries({
        queryKey: inventoryKeys.inventory(identity, shopId),
      });
      void queryClient.invalidateQueries({
        queryKey: analyticsKeys.dashboardRoot(identity),
      });
    },
  });
}

/** Saves locally first; the existing sync mutation protocol persists the correction. */
export function useUpdateReceiptMerchant(
  identity: AuthenticatedContext,
  shopId: ShopId,
) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({ id, merchantName }: { id: string; merchantName: string }) =>
      apiFetch<{ receipt: Receipt }>(`/receipts/${id}`, {
        method: 'PATCH',
        identity,
        shopId,
        body: { merchantName },
      }),
    onSuccess: (data, { id }) => {
      if (!isApiIdentityCurrent(identity, shopId)) return;
      const key = receiptsKeys.receipt(identity, shopId, id);
      queryClient.setQueryData<{ receipt: ReceiptDetail }>(key, (old) =>
        old ? { receipt: { ...old.receipt, ...data.receipt } } : old,
      );
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({
        queryKey: receiptsKeys.receipts(identity, shopId),
      });
    },
  });
}

export function useDeleteReceipt(
  identity: AuthenticatedContext,
  shopId: ShopId,
): UseMutationResult<{ ok: true }, Error, { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({ id }) =>
      apiFetch<{ ok: true }>(`/receipts/${id}`, {
        method: 'DELETE',
        identity,
        shopId,
      }),
    onSuccess: (_data, { id }) => {
      if (!isApiIdentityCurrent(identity, shopId)) return;
      queryClient.removeQueries({
        queryKey: receiptsKeys.receipt(identity, shopId, id),
      });
      void queryClient.invalidateQueries({
        queryKey: receiptsKeys.receipts(identity, shopId),
      });
      void queryClient.invalidateQueries({
        queryKey: inventoryKeys.inventory(identity, shopId),
      });
    },
  });
}
