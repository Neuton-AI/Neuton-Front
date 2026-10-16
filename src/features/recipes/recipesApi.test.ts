import { analyticsKeys } from '@/features/analytics/keys';
import { buildRecipe } from '@/test/factories/recipes.factory';
import { apiPath, requireContext } from '@/test/mocks/handlers/context';
import { server } from '@/test/mocks/server';
import { createTestQueryClient, renderHookWithProviders } from '@/test/render';
import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { recipesKeys } from './keys';
import { useDeleteRecipe, useRecipe, useRecipes, useVerifyRecipe } from './recipesApi';

describe('recipes API contracts', () => {
  it('enables only active lists with credentials and a shop', () => {
    const list = renderHookWithProviders(() => useRecipes('token-1', 'shop-1', false));
    const detail = renderHookWithProviders(() => useRecipe('token-1', null, 'rp-1'));
    expect(list.result.current.fetchStatus).toBe('idle');
    expect(detail.result.current.fetchStatus).toBe('idle');
  });
  it('polls processing details and stops immediately on verification', async () => {
    vi.useFakeTimers();
    let calls = 0;
    server.use(
      http.get(apiPath('/recipes/rp-1'), () => {
        calls += 1;
        return HttpResponse.json({
          recipe: buildRecipe({ status: calls === 1 ? 'processing' : 'verified' }),
        });
      }),
    );
    const { result } = renderHookWithProviders(() => useRecipe('token-1', 'shop-1', 'rp-1'));
    await act(() => vi.advanceTimersByTimeAsync(20));
    expect(result.current.data?.recipe.status).toBe('processing');
    await act(() => vi.advanceTimersByTimeAsync(3020));
    expect(result.current.data?.recipe.status).toBe('verified');
    await act(() => vi.advanceTimersByTimeAsync(6000));
    expect(calls).toBe(2);
  });
  it('polls a list only while a recipe is pending', async () => {
    vi.useFakeTimers();
    let calls = 0;
    server.use(
      http.get(apiPath('/recipes'), () => {
        calls += 1;
        return HttpResponse.json({
          recipes: [buildRecipe({ status: calls === 1 ? 'pending' : 'failed' })],
        });
      }),
    );
    const { result } = renderHookWithProviders(() => useRecipes('token-1', 'shop-1'));
    await act(() => vi.advanceTimersByTimeAsync(20));
    expect(result.current.data?.recipes[0]?.status).toBe('pending');
    await act(() => vi.advanceTimersByTimeAsync(3020));
    expect(result.current.data?.recipes[0]?.status).toBe('failed');
    await act(() => vi.advanceTimersByTimeAsync(6000));
    expect(calls).toBe(2);
  });
  it('sends an empty verification object, preserves detail data and invalidates orderable recipes', async () => {
    let body: unknown;
    server.use(
      http.post(apiPath('/recipes/rp-1/verify'), async ({ request }) => {
        body = await request.json();
        return requireContext(request) ?? HttpResponse.json({ recipe: { status: 'verified' } });
      }),
    );
    const client = createTestQueryClient();
    client.setDefaultOptions({ queries: { gcTime: Infinity, retry: false } });
    client.setQueryData(recipesKeys.recipe('shop-1', 'rp-1'), { recipe: buildRecipe() });
    client.setQueryData(recipesKeys.recipes('shop-1'), { recipes: [] });
    client.setQueryData(recipesKeys.orderableRecipes('shop-1'), { recipes: [] });
    const { result } = renderHookWithProviders(() => useVerifyRecipe('token-1', 'shop-1'), {
      queryClient: client,
    });
    await act(() => result.current.mutateAsync({ id: 'rp-1' }));
    expect(body).toEqual({});
    expect(client.getQueryData(recipesKeys.recipe('shop-1', 'rp-1'))).toEqual({
      recipe: buildRecipe({ status: 'verified' }),
    });
    expect(client.getQueryState(recipesKeys.orderableRecipes('shop-1'))?.isInvalidated).toBe(true);
    expect(client.getQueryState(recipesKeys.recipes('shop-1'))?.isInvalidated).toBe(true);
    client.clear();
  });
  it('removes deleted detail and invalidates recipes and money', async () => {
    server.use(
      http.delete(
        apiPath('/recipes/rp-1'),
        ({ request }) => requireContext(request) ?? HttpResponse.json({ ok: true, mode: 'soft' }),
      ),
    );
    const client = createTestQueryClient();
    client.setDefaultOptions({ queries: { gcTime: Infinity, retry: false } });
    client.setQueryData(recipesKeys.recipe('shop-1', 'rp-1'), { recipe: buildRecipe() });
    client.setQueryData(recipesKeys.recipes('shop-1'), {});
    client.setQueryData(analyticsKeys.dashboard('shop-1', '30d'), {});
    const { result } = renderHookWithProviders(() => useDeleteRecipe('token-1', 'shop-1'), {
      queryClient: client,
    });
    await act(() => result.current.mutateAsync({ id: 'rp-1' }));
    expect(client.getQueryData(recipesKeys.recipe('shop-1', 'rp-1'))).toBeUndefined();
    expect(client.getQueryState(recipesKeys.recipes('shop-1'))?.isInvalidated).toBe(true);
    expect(client.getQueryState(analyticsKeys.dashboard('shop-1', '30d'))?.isInvalidated).toBe(
      true,
    );
    client.clear();
  });
  it('propagates rejected reads as typed API errors', async () => {
    server.use(
      http.get(apiPath('/recipes/rp-1'), () =>
        HttpResponse.json({ error: { message: 'Forbidden' } }, { status: 403 }),
      ),
    );
    const { result } = renderHookWithProviders(() => useRecipe('token-1', 'shop-1', 'rp-1'));
    await waitFor(() =>
      expect(result.current.error).toMatchObject({ status: 403, message: 'Forbidden' }),
    );
  });
});
