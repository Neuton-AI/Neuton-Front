import { analyticsKeys } from '@/features/analytics/keys';
import { buildOrder } from '@/test/factories/order.factory';
import { apiPath, requireContext } from '@/test/mocks/handlers/context';
import { server } from '@/test/mocks/server';
import { createTestQueryClient, renderHookWithProviders } from '@/test/render';
import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { ordersKeys } from './keys';
import {
  useCreateOrder,
  useDeleteOrder,
  useMarkOrderDelivered,
  useOrder,
  useOrderQuote,
  useOrders,
} from './ordersApi';

beforeEach(() => server.resetHandlers());
describe('orders API contracts', () => {
  it.each([
    [null, 'shop-1'],
    ['token-1', null],
    [null, null],
  ])('does not request without token %s and shop %s', async (token, shop) => {
    const { result } = renderHookWithProviders(() => useOrders(token, shop, 'all'));
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
    const { result } = renderHookWithProviders(() => useOrders('token-1', 'shop-1', 'delivered'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(new URL(url).searchParams.get('status')).toBe('delivered');
    expect(new URL(url).searchParams.get('limit')).toBe('100');
  });
  it('keeps detail disabled without an ID and quote disabled without items', () => {
    const detail = renderHookWithProviders(() => useOrder('token-1', 'shop-1', ''));
    const quote = renderHookWithProviders(() =>
      useOrderQuote('token-1', 'shop-1', { items: [], distanceKm: 0, enabled: true }),
    );
    expect(detail.result.current.fetchStatus).toBe('idle');
    expect(quote.result.current.fetchStatus).toBe('idle');
  });
  it('posts the quote payload and exposes server failures', async () => {
    let body: unknown;
    server.use(
      http.post(apiPath('/orders/quote'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ error: { message: 'Cannot price' } }, { status: 422 });
      }),
    );
    const { result } = renderHookWithProviders(() =>
      useOrderQuote('token-1', 'shop-1', {
        items: [{ recipeId: 'rp-1', quantity: 2 }],
        distanceKm: 5,
        enabled: true,
      }),
    );
    await waitFor(() => expect(result.current.error?.message).toBe('Cannot price'));
    expect(body).toEqual({ items: [{ recipeId: 'rp-1', quantity: 2 }], deliveryDistanceKm: 5 });
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
    const { result } = renderHookWithProviders(() => useCreateOrder('token-1', 'shop-1'), {
      queryClient: client,
    });
    const payload = {
      customerName: 'Ada',
      orderDate: '2026-10-16',
      destinationAddress: null,
      deliveryDistanceKm: 3,
      items: [{ recipeId: 'rp-1', quantity: 2 }],
    };
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
    const { result } = renderHookWithProviders(() => useDeleteOrder('token-1', 'shop-1'), {
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
    const { result } = renderHookWithProviders(() => useMarkOrderDelivered('token-1', 'shop-1'), {
      queryClient: client,
    });
    await act(() => result.current.mutateAsync({ id: 'o1' }));
    expect(client.getQueryData(ordersKeys.order('shop-1', 'o1'))).toEqual({
      order: { ...buildOrder(), status: 'delivered', items },
    });
  });
});
