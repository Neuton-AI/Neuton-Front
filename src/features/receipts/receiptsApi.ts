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
import type { ShopId, Token } from '@/lib/queryTypes';
import { enabled } from '@/lib/queryTypes';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

export function useReceipts(
  token: Token,
  shopId: ShopId,
  active = true,
): UseQueryResult<{ receipts: Receipt[] }> {
  return useQuery({
    queryKey: receiptsKeys.receipts(shopId),
    queryFn: ({ signal }) =>
      apiFetch<{ receipts: Receipt[] }>('/receipts?limit=50', { token, shopId, signal }),
    enabled: enabled(token, shopId) && active,
  });
}

export function useReceipt(
  token: Token,
  shopId: ShopId,
  id: string,
): UseQueryResult<{ receipt: ReceiptDetail }> {
  return useQuery({
    queryKey: receiptsKeys.receipt(shopId, id),
    queryFn: ({ signal }) =>
      apiFetch<{ receipt: ReceiptDetail }>(`/receipts/${id}`, {
        token,
        shopId,
        signal,
      }),
    enabled: enabled(token, shopId) && Boolean(id),
    // The shop event stream refreshes processing and review states alike.
  });
}

export function useVerifyReceipt(
  token: Token,
  shopId: ShopId,
): UseMutationResult<
  VerifyReceiptOutcome,
  Error,
  { id: string; body: VerifyReceiptBody }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) =>
      apiFetch<VerifyReceiptOutcome>(`/receipts/${id}/verify`, {
        method: 'POST',
        token,
        shopId,
        body,
      }),
    onSuccess: (data, { id }) => {
      const key = receiptsKeys.receipt(shopId, id);
      queryClient.setQueryData<{ receipt: ReceiptDetail }>(key, (old) =>
        old ? { receipt: { ...old.receipt, status: data.status } } : old,
      );
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: receiptsKeys.receipts(shopId) });
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.inventory(shopId) });
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.dashboardRoot });
    },
  });
}

/** Saves locally first; the existing sync mutation protocol persists the correction. */
export function useUpdateReceiptMerchant(token: Token, shopId: ShopId) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({ id, merchantName }: { id: string; merchantName: string }) =>
      apiFetch<{ receipt: Receipt }>(`/receipts/${id}`, {
        method: 'PATCH',
        token,
        shopId,
        body: { merchantName },
      }),
    onSuccess: (data, { id }) => {
      const key = receiptsKeys.receipt(shopId, id);
      queryClient.setQueryData<{ receipt: ReceiptDetail }>(key, (old) =>
        old ? { receipt: { ...old.receipt, ...data.receipt } } : old,
      );
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({
        queryKey: receiptsKeys.receipts(shopId),
      });
    },
  });
}

export function useDeleteReceipt(
  token: Token,
  shopId: ShopId,
): UseMutationResult<{ ok: true }, Error, { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) =>
      apiFetch<{ ok: true }>(`/receipts/${id}`, {
        method: 'DELETE',
        token,
        shopId,
      }),
    onSuccess: (_data, { id }) => {
      queryClient.removeQueries({ queryKey: receiptsKeys.receipt(shopId, id) });
      void queryClient.invalidateQueries({ queryKey: receiptsKeys.receipts(shopId) });
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.inventory(shopId) });
    },
  });
}
