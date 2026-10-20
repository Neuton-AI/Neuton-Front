import { resetAuth } from '@/test/auth';
import { apiPath } from '@/test/mocks/handlers/context';
import { server } from '@/test/mocks/server';
import { renderHookWithProviders } from '@/test/render';
import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, expect, it, vi } from 'vitest';
import { useOrderDetailPage } from './OrderDetailPage.module';
vi.mock('@/features/auth/supabase', async () => (await import('@/test/auth')).authMock);
vi.mock('react-router-dom', async (original) => ({
  ...(await original<typeof import('react-router-dom')>()),
  useParams: () => ({ id: 'o1' }),
}));
beforeEach(resetAuth);
it('derives margin from server money and exposes failed delivery near its action', async () => {
  server.use(
    http.post(apiPath('/orders/o1/verify'), () =>
      HttpResponse.json({ error: { message: 'Delivery failed' } }, { status: 500 }),
    ),
  );
  const { result } = renderHookWithProviders(() => useOrderDetailPage());
  await waitFor(() => expect(result.current.order).not.toBeNull());
  expect(result.current.marginPercent).toBeCloseTo((22.12 / 62.12) * 100);
  await act(() => result.current.markDelivered());
  expect(result.current.markError).toBe('Delivery failed');
  expect(result.current.error).toBeNull();
});

vi.mock('@/features/sync/documentsApi', async () => ({ documentFetch: (await import('@/lib/api')).apiFetch }));
