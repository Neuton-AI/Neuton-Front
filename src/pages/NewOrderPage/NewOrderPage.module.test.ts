import { authState, resetAuth } from '@/test/auth';
import { apiPath } from '@/test/mocks/handlers/context';
import { buildOrderableRecipe, buildQuote } from '@/test/mocks/handlers/orders.handlers';
import { server } from '@/test/mocks/server';
import { renderHookWithProviders } from '@/test/render';
import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { FormEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNewOrderPage } from './NewOrderPage.module';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('@/features/auth/supabase', async () => (await import('@/test/auth')).authMock);
vi.mock('react-router-dom', async (original) => ({
  ...(await original<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));
const event = { preventDefault: vi.fn() } as unknown as FormEvent;
beforeEach(() => {
  resetAuth();
  navigate.mockReset();
});

describe('useNewOrderPage', () => {
  it('loads recipes, clamps quantities at zero, and removes the last line', async () => {
    const { result } = renderHookWithProviders(() => useNewOrderPage());
    await waitFor(() => expect(result.current.recipes).toHaveLength(1));
    expect(result.current.lines).toEqual([]);
    act(() => result.current.changeQuantity(buildOrderableRecipe(), -1));
    expect(result.current.quantityOf('rp-1')).toBe(0);
    act(() => result.current.changeQuantity(buildOrderableRecipe(), 2));
    expect(result.current.quantityOf('rp-1')).toBe(2);
    act(() => result.current.changeQuantity(buildOrderableRecipe(), -2));
    expect(result.current.lines).toEqual([]);
    expect(result.current.quote).toBeNull();
  });
  it('debounces quantity and distance changes into one quote request', async () => {
    const requests: unknown[] = [];
    server.use(
      http.post(apiPath('/orders/quote'), async ({ request }) => {
        requests.push(await request.json());
        return HttpResponse.json(buildQuote());
      }),
    );
    const { result } = renderHookWithProviders(() => useNewOrderPage());
    await waitFor(() => expect(result.current.recipes).toHaveLength(1));
    act(() => {
      result.current.changeQuantity(buildOrderableRecipe(), 1);
      result.current.handleFieldChange('deliveryDistanceKm', '3');
    });
    act(() => result.current.changeQuantity(buildOrderableRecipe(), 1));
    expect(requests).toEqual([]);
    await waitFor(() => expect(result.current.quote).not.toBeNull());
    expect(requests).toEqual([
      { items: [{ recipeId: 'rp-1', quantity: 2 }], deliveryDistanceKm: 3 },
    ]);
  });
  it('normalizes order fields and navigates to the saved order', async () => {
    let body: unknown;
    server.use(
      http.post(apiPath('/orders'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ order: { id: 'saved' }, totals: { netProfit: 1 } });
      }),
    );
    const { result } = renderHookWithProviders(() => useNewOrderPage());
    await waitFor(() => expect(result.current.recipes).toHaveLength(1));
    act(() => {
      result.current.changeQuantity(buildOrderableRecipe(), 1);
      result.current.handleFieldChange('customerName', '  Ada  ');
      result.current.handleFieldChange('destinationAddress', '  ');
      result.current.handleFieldChange('orderDate', '2026-10-16');
    });
    await act(() => result.current.submit(event));
    expect(body).toMatchObject({
      customerName: 'Ada',
      destinationAddress: null,
      items: [{ recipeId: 'rp-1', quantity: 1 }],
      deliveryDistanceKm: 0,
    });
    expect(navigate).toHaveBeenCalledWith('/orders/saved', { state: { fresh: true } });
  });
  it('surfaces recipe, quote, and save failures without losing the draft', async () => {
    server.use(
      http.post(apiPath('/orders'), () =>
        HttpResponse.json({ error: { message: 'Cannot save' } }, { status: 500 }),
      ),
      http.post(apiPath('/orders/quote'), () =>
        HttpResponse.json({ error: { message: 'Cannot quote' } }, { status: 422 }),
      ),
    );
    const { result } = renderHookWithProviders(() => useNewOrderPage());
    await waitFor(() => expect(result.current.recipes).toHaveLength(1));
    act(() => result.current.changeQuantity(buildOrderableRecipe(), 1));
    await waitFor(() => expect(result.current.quoteError).toBe('Cannot quote'));
    await act(() => result.current.submit(event));
    expect(result.current.itemsError).toBe('Cannot save');
    expect(result.current.lines).toHaveLength(1);
    expect(navigate).not.toHaveBeenCalled();
  });
  it('rejects empty, anonymous, and invalid-distance submissions', async () => {
    const { result } = renderHookWithProviders(() => useNewOrderPage());
    await act(() => result.current.submit(event));
    act(() => {
      result.current.changeQuantity(buildOrderableRecipe(), 1);
      result.current.handleFieldChange('deliveryDistanceKm', '-1');
    });
    await act(() => result.current.submit(event));
    expect(result.current.itemsError).toMatch(/outside the allowed range/);
    authState.token = null;
    await act(() => result.current.submit(event));
    expect(navigate).not.toHaveBeenCalled();
  });
});
