import { analyticsKeys } from '@/features/analytics/keys';
import { inventoryKeys } from '@/features/inventory/keys';
import { buildReceiptDetail } from '@/test/factories/receipts.factory';
import { apiPath, requireContext } from '@/test/mocks/handlers/context';
import { server } from '@/test/mocks/server';
import { createTestQueryClient, renderHookWithProviders } from '@/test/render';
import { act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { receiptsKeys } from './keys';
import { useDeleteReceipt, useReceipt, useReceipts, useVerifyReceipt } from './receiptsApi';

describe('receipts API contracts', () => {
  it('does not request an inactive list or an unidentified detail', () => {
    const list = renderHookWithProviders(() => useReceipts('token-1', 'shop-1', false));
    const detail = renderHookWithProviders(() => useReceipt('token-1', 'shop-1', ''));
    expect(list.result.current.fetchStatus).toBe('idle');
    expect(detail.result.current.fetchStatus).toBe('idle');
  });
  it('polls processing receipts and stops at human review', async () => {
    vi.useFakeTimers();
    let calls = 0;
    server.use(
      http.get(apiPath('/receipts/rc-1'), () => {
        calls += 1;
        return HttpResponse.json({
          receipt: buildReceiptDetail({ status: calls === 1 ? 'processing' : 'unverified' }),
        });
      }),
    );
    const { result } = renderHookWithProviders(() => useReceipt('token-1', 'shop-1', 'rc-1'));
    await act(() => vi.advanceTimersByTimeAsync(20));
    expect(result.current.data?.receipt.status).toBe('processing');
    await act(() => vi.advanceTimersByTimeAsync(3020));
    expect(result.current.data?.receipt.status).toBe('unverified');
    await act(() => vi.advanceTimersByTimeAsync(6000));
    expect(calls).toBe(2);
  });
  it('posts accepted line IDs and invalidates receipts, inventory and money', async () => {
    let body: unknown;
    server.use(
      http.post(apiPath('/receipts/rc-1/verify'), async ({ request }) => {
        body = await request.json();
        return requireContext(request) ?? HttpResponse.json({ status: 'verified' });
      }),
    );
    const client = createTestQueryClient();
    client.setDefaultOptions({ queries: { gcTime: Infinity, retry: false } });
    client.setQueryData(receiptsKeys.receipt('shop-1', 'rc-1'), { receipt: buildReceiptDetail() });
    client.setQueryData(receiptsKeys.receipts('shop-1'), {});
    client.setQueryData(inventoryKeys.inventory('shop-1'), {});
    client.setQueryData(analyticsKeys.dashboard('shop-1', '30d'), {});
    const { result } = renderHookWithProviders(() => useVerifyReceipt('token-1', 'shop-1'), {
      queryClient: client,
    });
    const payload = { items: [{ id: 'li-1', accepted: true }] };
    await act(() => result.current.mutateAsync({ id: 'rc-1', body: payload }));
    expect(body).toEqual(payload);
    expect(client.getQueryData(receiptsKeys.receipt('shop-1', 'rc-1'))).toEqual({
      receipt: { ...buildReceiptDetail(), status: 'verified' },
    });
    expect(client.getQueryState(receiptsKeys.receipts('shop-1'))?.isInvalidated).toBe(true);
    expect(client.getQueryState(inventoryKeys.inventory('shop-1'))?.isInvalidated).toBe(true);
    expect(client.getQueryState(analyticsKeys.dashboard('shop-1', '30d'))?.isInvalidated).toBe(
      true,
    );
    client.clear();
  });
  it('removes deleted detail and invalidates receipt and inventory lists', async () => {
    server.use(
      http.delete(
        apiPath('/receipts/rc-1'),
        ({ request }) => requireContext(request) ?? HttpResponse.json({ ok: true }),
      ),
    );
    const client = createTestQueryClient();
    client.setDefaultOptions({ queries: { gcTime: Infinity, retry: false } });
    client.setQueryData(receiptsKeys.receipt('shop-1', 'rc-1'), { receipt: buildReceiptDetail() });
    client.setQueryData(receiptsKeys.receipts('shop-1'), {});
    client.setQueryData(inventoryKeys.inventory('shop-1'), {});
    const { result } = renderHookWithProviders(() => useDeleteReceipt('token-1', 'shop-1'), {
      queryClient: client,
    });
    await act(() => result.current.mutateAsync({ id: 'rc-1' }));
    expect(client.getQueryData(receiptsKeys.receipt('shop-1', 'rc-1'))).toBeUndefined();
    expect(client.getQueryState(receiptsKeys.receipts('shop-1'))?.isInvalidated).toBe(true);
    expect(client.getQueryState(inventoryKeys.inventory('shop-1'))?.isInvalidated).toBe(true);
    client.clear();
  });
});
