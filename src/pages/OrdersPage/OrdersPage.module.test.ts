import { resetAuth } from '@/test/auth';
import { buildOrder } from '@/test/factories/order.factory';
import { apiPath } from '@/test/mocks/handlers/context';
import { server } from '@/test/mocks/server';
import { renderHookWithProviders } from '@/test/render';
import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, expect, it, vi } from 'vitest';
import { useOrdersPage } from './OrdersPage.module';
vi.mock('@/features/auth/supabase', async () => (await import('@/test/auth')).authMock);
beforeEach(resetAuth);
it('exposes real empty data and never inserts a demonstration sale', async () => {
  const { result } = renderHookWithProviders(() => useOrdersPage());
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.visibleOrders).toEqual([]);
});
it('sorts sales newest first and preserves empty status-filter results', async () => {
  server.use(
    http.get(apiPath('/orders'), ({ request }) =>
      HttpResponse.json({
        orders: new URL(request.url).searchParams.has('status')
          ? []
          : [
              buildOrder({ id: 'older', orderDate: '2026-01-01' }),
              buildOrder({ id: 'newer', orderDate: '2026-10-16' }),
            ],
        total: 2,
      }),
    ),
  );
  const { result } = renderHookWithProviders(() => useOrdersPage());
  await waitFor(() =>
    expect(result.current.visibleOrders.map((order) => order.id)).toEqual(['newer', 'older']),
  );
  act(() => result.current.setStatusFilter('cancelled'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.visibleOrders).toEqual([]);
});

vi.mock('@/features/sync/documentsApi', async () => ({ documentFetch: (await import('@/lib/api')).apiFetch }));
