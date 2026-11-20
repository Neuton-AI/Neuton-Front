import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recipesKeys } from '@/features/recipes/keys';
import { buildRecipe } from '@/test/factories/recipes.factory';
import { apiPath } from '@/test/mocks/handlers/context';
import { server } from '@/test/mocks/server';
import { renderHookWithProviders } from '@/test/render';
import { useOrderDraft } from '../useOrderDraft';

vi.mock('@/features/sync/documentsApi', async () => ({ documentFetch: (await import('@/lib/api')).apiFetch }));
const recipe = buildRecipe({ status: 'verified', orderPricing: { unitPrice: '20.00', unitCost: '5.0000', costComplete: true } });
beforeEach(() => {
  server.use(http.get(apiPath('/recipes'), () => HttpResponse.json({ recipes: [recipe] })));
});

describe('scoped order draft', () => {
  it('keeps quantities and last known name/price across sync, loading errors and deletion', async () => {
    const { result, queryClient } = renderHookWithProviders(() => useOrderDraft('u', 'shop-1'));
    await waitFor(() => expect(result.current.recipes).toHaveLength(1));
    act(() => result.current.changeQuantity(recipe, 2));
    const changed = { ...recipe, name: 'New name', orderPricing: { ...recipe.orderPricing!, unitPrice: '30.00' } };
    act(() => queryClient.setQueryData(recipesKeys.recipes('shop-1'), { recipes: [changed] }));
    await waitFor(() => expect(result.current.subtotal).toBe(60));
    server.use(http.get(apiPath('/recipes'), () => HttpResponse.json({ error: { message: 'Sync failed' } }, { status: 503 })));
    await act(() => queryClient.invalidateQueries({ queryKey: recipesKeys.recipes('shop-1') }));
    expect(result.current.subtotal).toBe(60);
    expect(result.current.lines[0]).toMatchObject({ name: 'New name', quantity: 2, available: true });
    act(() => queryClient.setQueryData(recipesKeys.recipes('shop-1'), { recipes: [] }));
    await waitFor(() => expect(result.current.availableCount).toBe(0));
    expect(result.current.lines[0]).toMatchObject({ name: 'New name', unitPrice: '30.00', quantity: 2 });
  });

  it('keeps server corrections over stale catalog renders and releases them after equivalent sync', async () => {
    const { result, queryClient } = renderHookWithProviders(() => useOrderDraft('u', 'shop-1'));
    await waitFor(() => expect(result.current.recipes).toHaveLength(1));
    act(() => result.current.changeQuantity(recipe, 1));
    act(() => result.current.applyReview({ reasons: ['PRICE_CHANGED'], unavailable: [],
      priceChanges: [{ recipeId: recipe.id, name: recipe.name, expectedUnitPrice: '20.00', currentUnitPrice: '30.00' }],
      currentItems: [{ recipeId: recipe.id, name: 'Server name', unitPrice: '30.00', costComplete: false }],
    }));
    expect(result.current.subtotal).toBe(30);
    act(() => queryClient.setQueryData(recipesKeys.recipes('shop-1'), { recipes: [{ ...recipe, name: 'Stale rename' }] }));
    expect(result.current.subtotal).toBe(30);
    const synced = { ...recipe, name: 'Server name', orderPricing: { ...recipe.orderPricing!, unitPrice: '30.00', costComplete: false } };
    act(() => queryClient.setQueryData(recipesKeys.recipes('shop-1'), { recipes: [synced] }));
    await waitFor(() => expect(result.current.lines[0]?.name).toBe('Server name'));
    act(() => queryClient.setQueryData(recipesKeys.recipes('shop-1'), { recipes: [{ ...synced, orderPricing: { ...synced.orderPricing, unitPrice: '40.00' } }] }));
    await waitFor(() => expect(result.current.subtotal).toBe(40));
    expect(result.current.priceDiffByRecipeId[recipe.id]).toMatchObject({ old: 20, new: 40 });
  });

  it('clears selections on account/shop changes and never restores a prior scope draft', async () => {
    const { result, rerender } = renderHookWithProviders(({ user, shop }) => useOrderDraft(user, shop), {
      initialProps: { user: 'u', shop: 'shop-1' },
    });
    await waitFor(() => expect(result.current.recipes).toHaveLength(1));
    act(() => result.current.changeQuantity(recipe, 1));
    rerender({ user: 'other', shop: 'shop-1' });
    expect(result.current.lines).toEqual([]);
    rerender({ user: 'u', shop: 'shop-1' });
    expect(result.current.lines).toEqual([]);
    rerender({ user: 'u', shop: 'shop-2' });
    expect(result.current.recipes).toEqual([]);
  });

  it('keeps a correction across same-version reads and accepts a newer sync that skipped the corrected price', async () => {
    const cached = { ...recipe, localServerVersion: 12 };
    server.use(http.get(apiPath('/recipes'), () => HttpResponse.json({ recipes: [cached] })));
    const { result, queryClient } = renderHookWithProviders(() => useOrderDraft('u', 'shop-1'));
    await waitFor(() => expect(result.current.recipes).toHaveLength(1));
    act(() => {
      result.current.changeQuantity(recipe, 1);
      result.current.applyReview({
        reasons: ['PRICE_CHANGED'], unavailable: [],
        priceChanges: [{ recipeId: recipe.id, name: recipe.name, expectedUnitPrice: '20.00', currentUnitPrice: '30.00' }],
        currentItems: [{ recipeId: recipe.id, name: recipe.name, unitPrice: '30.00', costComplete: true }],
      });
    });
    act(() => result.current.remove(recipe.id));
    expect(result.current.recipes[0]?.orderPricing?.unitPrice).toBe('30.00');
    act(() => result.current.changeQuantity(recipe, 1));
    const key = recipesKeys.recipes('shop-1');
    act(() => queryClient.setQueryData(key, { recipes: [{ ...cached, name: 'Same version' }] }));
    await waitFor(() => expect(result.current.lines[0]?.unitPrice).toBe('30.00'));
    const newer = { ...cached, localServerVersion: 14, orderPricing: { ...recipe.orderPricing!, unitPrice: '40.00' } };
    act(() => queryClient.setQueryData(key, { recipes: [newer] }));
    await waitFor(() => expect(result.current.subtotal).toBe(40));
    expect(result.current.priceDiffByRecipeId[recipe.id]).toMatchObject({ old: 30, new: 40 });
  });
});
