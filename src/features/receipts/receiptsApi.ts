import { analyticsKeys } from '@/features/analytics/keys';
import { inventoryKeys } from '@/features/inventory/keys';
import { receiptsKeys } from '@/features/receipts/keys';
import {
  type Receipt,
  type ReceiptDetail,
  type VerifyReceiptBody,
  type VerifyReceiptOutcome,
} from '@/features/receipts/types';
import { apiFetch } from '@/lib/api';
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
      apiFetch<{ receipt: ReceiptDetail }>(`/receipts/${id}`, { token, shopId, signal }),
    enabled: enabled(token, shopId) && Boolean(id),
    // Only a receipt the worker is still chewing on gains lines asynchronously.
    // `unverified` hands over to a human, so polling it would just spin.
    refetchInterval: (query) => (query.state.data?.receipt.status === 'processing' ? 3000 : false),
  });
}

export function useVerifyReceipt(
  token: Token,
  shopId: ShopId,
): UseMutationResult<VerifyReceiptOutcome, Error, { id: string; body: VerifyReceiptBody }> {
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

export function useDeleteReceipt(
  token: Token,
  shopId: ShopId,
): UseMutationResult<{ ok: true }, Error, { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) =>
      apiFetch<{ ok: true }>(`/receipts/${id}`, { method: 'DELETE', token, shopId }),
    onSuccess: (_data, { id }) => {
      queryClient.removeQueries({ queryKey: receiptsKeys.receipt(shopId, id) });
      void queryClient.invalidateQueries({ queryKey: receiptsKeys.receipts(shopId) });
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.inventory(shopId) });
    },
  });
}
