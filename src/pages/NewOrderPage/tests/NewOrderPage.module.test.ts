import { authState, resetAuth } from '@/test/auth';
import { apiPath } from '@/test/mocks/handlers/context';
import { buildRecipe } from '@/test/factories/recipes.factory';
import { server } from '@/test/mocks/server';
import { renderHookWithProviders } from '@/test/render';
import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { FormEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNewOrderPage } from '../NewOrderPage.module';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('@/features/auth/auth', async () => (await import('@/test/auth')).authMock);
vi.mock('@/features/sync/documentsApi', async () => ({ documentFetch: (await import('@/lib/api')).apiFetch }));
vi.mock('react-router-dom', async original => ({ ...(await original<typeof import('react-router-dom')>()), useNavigate: () => navigate }));
const event = { preventDefault: vi.fn() } as unknown as FormEvent;
const recipe = buildRecipe({ status: 'verified', orderPricing: { unitPrice: '20.00', unitCost: '5.0000', costComplete: true } });
beforeEach(() => {
  resetAuth();
  navigate.mockReset();
  server.use(http.get(apiPath('/recipes'), () => HttpResponse.json({ recipes: [recipe] })));
});
const fill = (model: ReturnType<typeof useNewOrderPage>) => {
  model.handleFieldChange('customerName', '  Ada  ');
  model.handleFieldChange('destinationAddress', '  12 Main St  ');
};
describe('useNewOrderPage local integration', () => {
  it('uses only the local catalog and prices partial zero selections immediately', async () => {
    let forbidden = 0;
    server.use(
      http.get(apiPath('/recipes/orderable'), () => { forbidden++; return HttpResponse.json({ recipes: [] }); }),
      http.post(apiPath('/orders/quote'), () => { forbidden++; return HttpResponse.json({}); }),
      http.get(apiPath('/recipes'), () => HttpResponse.json({ recipes: [{ ...recipe, orderPricing: { unitPrice: '0.00', unitCost: '0.0000', costComplete: false } }] })),
    );
    const { result } = renderHookWithProviders(() => useNewOrderPage());
    await waitFor(() => expect(result.current.recipes).toHaveLength(1));
    act(() => result.current.changeQuantity(result.current.recipes[0]!, 2));
    expect(result.current.quantityOf(recipe.id)).toBe(2);
    expect(result.current.quoteSubtotal).toBe(0);
    expect(result.current.quote?.totalAmount).toBe(0);
    expect(forbidden).toBe(0);
  });
  it('sends final zero fee, separate delivery date and reviewed prices without distance/overrides', async () => {
    let body: unknown;
    server.use(http.post(apiPath('/orders'), async ({ request }) => {
      body = await request.json(); return HttpResponse.json({ order: { id: 'saved' }, totals: { netProfit: 1 } });
    }));
    const { result } = renderHookWithProviders(() => useNewOrderPage());
    await waitFor(() => expect(result.current.recipes).toHaveLength(1));
    act(() => {
      result.current.changeQuantity(result.current.recipes[0]!, 1);
      fill(result.current);
      result.current.handleFieldChange('orderDate', '2026-11-19');
      result.current.handleFieldChange('deliveryDate', '2026-11-22');
      result.current.handleFieldChange('deliveryFee', '0');
    });
    await act(() => result.current.submit(event));
    expect(body).toEqual({ customerName: 'Ada', destinationAddress: '12 Main St', orderDate: '2026-11-19T12:00:00.000Z', deliveryDate: '2026-11-22', deliveryFee: '0', items: [{ recipeId: recipe.id, quantity: 1, expectedUnitPrice: '20.00' }] });
    expect(navigate).toHaveBeenCalledWith('/orders/saved', { state: { fresh: true } });
  });
  it('retains the selected draft and form edits after a failed save and submits once', async () => {
    let writes = 0;
    server.use(http.post(apiPath('/orders'), () => { writes++; return HttpResponse.json({ error: { message: 'Cannot save' } }, { status: 503 }); }));
    const { result } = renderHookWithProviders(() => useNewOrderPage());
    await waitFor(() => expect(result.current.recipes).toHaveLength(1));
    act(() => { result.current.changeQuantity(result.current.recipes[0]!, 1); fill(result.current); });
    await act(() => result.current.submit(event));
    expect(result.current.itemsError).toBe('Cannot save');
    expect(result.current.quantityOf(recipe.id)).toBe(1);
    expect(result.current.formValues.customerName).toBe('  Ada  ');
    expect(writes).toBe(1);
    expect(navigate).not.toHaveBeenCalled();
  });
  it('rejects empty, anonymous, blank-required, invalid fee and invalid-date submissions', async () => {
    const { result, rerender } = renderHookWithProviders(() => useNewOrderPage());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => result.current.submit(event));
    act(() => result.current.changeQuantity(result.current.recipes[0]!, 1));
    await act(() => result.current.submit(event));
    expect(result.current.itemsError).toMatch(/required/);
    act(() => { fill(result.current); result.current.handleFieldChange('deliveryFee', '0.001'); });
    await act(() => result.current.submit(event));
    expect(result.current.itemsError).toMatch(/delivery fee/i);
    act(() => { result.current.handleFieldChange('deliveryFee', '0'); result.current.handleFieldChange('deliveryDate', '2026-02-29'); });
    await act(() => result.current.submit(event));
    expect(result.current.itemsError).toMatch(/date/i);
    authState.userId = null;
    rerender();
    await act(() => result.current.submit(event));
    expect(result.current.lines).toEqual([]);
    expect(navigate).not.toHaveBeenCalled();
  });
});
