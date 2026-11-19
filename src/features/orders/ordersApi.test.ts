import { analyticsKeys } from '@/features/analytics/keys';
import { buildOrder } from '@/test/factories/order.factory';
import { apiPath, requireContext } from '@/test/mocks/handlers/context';
import { server } from '@/test/mocks/server';
import { createTestQueryClient, renderHookWithProviders } from '@/test/render';
import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { onlineManager } from '@tanstack/react-query';
import { orderReviewDetails } from './reviewConflict';
import type { ReviewedCreateOrderBody } from './types';
import { ordersKeys } from './keys';
import {
  useCreateOrder,
  useDeleteOrder,
  useMarkOrderDelivered,
  useOrder,
  useOrders,
} from './ordersApi';

beforeEach(() => server.resetHandlers());
describe('orders API contracts', () => {
  it.each([
    [null, 'shop-1'],
    ['userId-1', null],
    [null, null],
  ])('does not request without userId %s and shop %s', async (userId, shop) => {
    const { result } = renderHookWithProviders(() => useOrders(userId, shop, 'all'));
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });
  it('sends tenant context and encodes the selected filter', async () => {
    let url = '';
    server.use(
      http.get(apiPath('/orders'), ({ request }) => {
        url = request.url;
        return requireContext(request) ?? HttpResponse.json({ orders: [buildOrder()], total: 1 });
      }),
    );
    const { result } = renderHookWithProviders(() => useOrders('userId-1', 'shop-1', 'delivered'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(new URL(url).searchParams.get('status')).toBe('delivered');
    expect(new URL(url).searchParams.get('limit')).toBe('100');
  });
  it('keeps detail disabled without an ID', () => {
    const detail = renderHookWithProviders(() => useOrder('userId-1', 'shop-1', ''));
    expect(detail.result.current.fetchStatus).toBe('idle');
  });
  it('posts a new order and invalidates sales and dashboard caches', async () => {
    const client = createTestQueryClient();
    client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
    client.setQueryData(ordersKeys.orders('shop-1', 'all'), { orders: [], total: 0 });
    client.setQueryData(analyticsKeys.dashboard('shop-1', '30d'), {});
    let body: unknown;
    server.use(
      http.post(apiPath('/orders'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ order: buildOrder(), totals: { netProfit: 1 } });
      }),
    );
    const { result } = renderHookWithProviders(() => useCreateOrder('userId-1', 'shop-1'), {
      queryClient: client,
    });
    const payload = reviewedPayload;
    await act(() => result.current.mutateAsync(payload));
    expect(body).toEqual(payload);
    expect(client.getQueryState(ordersKeys.orders('shop-1', 'all'))?.isInvalidated).toBe(true);
    expect(client.getQueryState(analyticsKeys.dashboard('shop-1', '30d'))?.isInvalidated).toBe(
      true,
    );
  });
  it('removes deleted detail and invalidates sales and money', async () => {
    const client = createTestQueryClient();
    client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
    client.setQueryData(ordersKeys.order('shop-1', 'o1'), { order: buildOrder() });
    client.setQueryData(ordersKeys.orders('shop-1', 'all'), { orders: [], total: 0 });
    client.setQueryData(analyticsKeys.dashboard('shop-1', '30d'), {});
    server.use(
      http.delete(
        apiPath('/orders/o1'),
        ({ request }) => requireContext(request) ?? new HttpResponse(null, { status: 204 }),
      ),
    );
    const { result } = renderHookWithProviders(() => useDeleteOrder('userId-1', 'shop-1'), {
      queryClient: client,
    });
    await act(() => result.current.mutateAsync({ id: 'o1' }));
    expect(client.getQueryData(ordersKeys.order('shop-1', 'o1'))).toBeUndefined();
    expect(client.getQueryState(ordersKeys.orders('shop-1', 'all'))?.isInvalidated).toBe(true);
    expect(client.getQueryState(analyticsKeys.dashboard('shop-1', '30d'))?.isInvalidated).toBe(
      true,
    );
  });
  it('marks delivery without discarding cached line items', async () => {
    const client = createTestQueryClient();
    client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
    const items = [
      { id: 'line', recipeId: 'rp-1', name: 'Soup', quantity: '1', unitCost: '3', unitPrice: '5' },
    ];
    client.setQueryData(ordersKeys.order('shop-1', 'o1'), { order: { ...buildOrder(), items } });
    server.use(
      http.post(
        apiPath('/orders/o1/verify'),
        ({ request }) =>
          requireContext(request) ?? HttpResponse.json({ order: { status: 'delivered' } }),
      ),
    );
    const { result } = renderHookWithProviders(() => useMarkOrderDelivered('userId-1', 'shop-1'), {
      queryClient: client,
    });
    await act(() => result.current.mutateAsync({ id: 'o1' }));
    expect(client.getQueryData(ordersKeys.order('shop-1', 'o1'))).toEqual({
      order: { ...buildOrder(), status: 'delivered', items },
    });
  });
});

// Domain hook contracts use the network adapter; persistent synchronization has its own integration suite.
vi.mock('@/features/sync/documentsApi', async () => ({ documentFetch: (await import('@/lib/api')).apiFetch }));
import { vi } from 'vitest';


afterEach(() => { act(() => onlineManager.setOnline(true)); });
const reviewedPayload: ReviewedCreateOrderBody = {
  customerName: 'Dana', orderDate: '2026-11-19T12:00:00Z', deliveryDate: '2026-11-20',
  destinationAddress: 'Market Street', deliveryFee: '0.00',
  items: [{ recipeId: '11111111-1111-1111-1111-111111111111', quantity: 2, expectedUnitPrice: '2.60' }],
  confirmedUnavailableRecipeIds: [],
};
it('sends reviewed prices, final zero fee and dates without converting them to overrides', async () => {
  let body: unknown;
  server.use(http.post(apiPath('/orders'), async ({ request }) => {
    body = await request.json();
    return HttpResponse.json({ order: buildOrder({ deliveryDate: '2026-11-20' }), totals: { netProfit: 0 } });
  }));
  const { result } = renderHookWithProviders(() => useCreateOrder('userId-1', 'shop-1'));
  await act(() => result.current.mutateAsync(reviewedPayload));
  expect(body).toEqual(reviewedPayload);
  expect(result.current.data?.order.deliveryDate).toBe('2026-11-20');
});
it('preserves review corrections and never inherits automatic create retries', async () => {
  const client = createTestQueryClient();
  client.setDefaultOptions({ mutations: { retry: 3, retryDelay: 0 } });
  let calls = 0;
  const details = { reasons: ['PRICE_CHANGED'], unavailable: [],
    priceChanges: [{ recipeId: reviewedPayload.items[0].recipeId, name: 'Focaccia', expectedUnitPrice: '2.60', currentUnitPrice: '3.00' }],
    currentItems: [{ recipeId: reviewedPayload.items[0].recipeId, name: 'Focaccia', unitPrice: '3.00', costComplete: true }] };
  server.use(http.post(apiPath('/orders'), () => {
    calls++;
    return HttpResponse.json({ error: { code: 'ORDER_REVIEW_REQUIRED', message: 'Review the updated order.', details } }, { status: 409 });
  }));
  const { result } = renderHookWithProviders(() => useCreateOrder('userId-1', 'shop-1'), { queryClient: client });
  await act(async () => { await result.current.mutateAsync(reviewedPayload).catch(() => undefined); });
  expect(calls).toBe(1);
  expect(orderReviewDetails(result.current.error)).toEqual(details);
  expect(result.current.variables).toEqual(reviewedPayload);
});
it('fails an offline create instead of keeping a paused mutation that resumes on reconnection', async () => {
  let calls = 0;
  server.use(http.post(apiPath('/orders'), () => { calls++; return HttpResponse.error(); }));
  onlineManager.setOnline(false);
  const { result } = renderHookWithProviders(() => useCreateOrder('userId-1', 'shop-1'));
  act(() => { void result.current.mutateAsync(reviewedPayload).catch(() => undefined); });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.isPaused).toBe(false);
  expect(result.current.error).toMatchObject({ status: 0 });
  act(() => onlineManager.setOnline(true));
  await act(async () => { await Promise.resolve(); });
  expect(calls).toBe(1);
});
