import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * N-79 regression net: `neuton.activeShopId` used to hold whatever shop was
 * selected last, even after the membership backing it was gone. Queries fell
 * back to `rows[0]`, so the app worked, but the stale key survived every reload
 * and every debug session read a shop the user no longer belonged to. These
 * tests pin the storage contract: the key always ends up matching the id the
 * hook actually selects, or is removed when there is nothing to select.
 */

const ACTIVE_SHOP_KEY = 'neuton.activeShopId';

const state = vi.hoisted(() => ({
  rows: [] as Array<{ shop_id: string; role: string }>,
  offline: false,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({
        order: async () => ({
          data: state.rows.map((row) => ({
            ...row,
            shops: { id: row.shop_id, name: 'testShop', currency: 'USD' },
          })),
          error: state.offline ? new Error('Network unavailable') : null,
        }),
      }),
    }),
  }),
}));

/** A membership row exactly as PostgREST returns it for this hook's select. */
function member(shopId: string) {
  return { shop_id: shopId, role: 'owner' };
}

/**
 * The Supabase client is built once at module load from the Vite env, so the
 * module has to be imported after the env is stubbed and cleared between cases.
 */
async function loadHook() {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
  vi.resetModules();
  const { useShopMemberships } = await import('@/features/auth/supabase');
  return useShopMemberships;
}

async function renderMemberships(userId = 'u1') {
  const useShopMemberships = await loadHook();
  const { result } = renderHook(() => useShopMemberships(userId));
  await waitFor(() => expect(result.current.loading).toBe(false));
  return result;
}

beforeEach(() => {
  state.rows = [];
  state.offline = false;
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  localStorage.clear();
});

describe('useShopMemberships active shop persistence', () => {
  it('restores only this user\'s cached shops when reopening offline', async () => {
    state.offline = true;
    localStorage.setItem('neuton.memberships:u1', JSON.stringify([{ shopId: 'saved-shop', role: 'owner', shops: { id: 'saved-shop', name: 'testShop' } }]));
    const result = await renderMemberships();
    expect(result.current.activeShopId).toBe('saved-shop');
    const other = await renderMemberships('u2');
    expect(other.current.activeShopId).toBeNull();
    expect(other.current.memberships).toEqual([]);
  });
  it('rewrites a stale stored id to the first valid membership', async () => {
    state.rows = [member('valid-shop')];
    localStorage.setItem(ACTIVE_SHOP_KEY, 'foreign-shop');

    const result = await renderMemberships();

    expect(result.current.activeShopId).toBe('valid-shop');
    expect(localStorage.getItem(ACTIVE_SHOP_KEY)).toBe('valid-shop');
  });

  it('keeps a stored id that still matches a membership', async () => {
    state.rows = [member('shop-a'), member('shop-b')];
    localStorage.setItem(ACTIVE_SHOP_KEY, 'shop-b');

    const result = await renderMemberships();

    expect(result.current.activeShopId).toBe('shop-b');
    expect(localStorage.getItem(ACTIVE_SHOP_KEY)).toBe('shop-b');
  });

  it('removes the key when the user has no memberships left', async () => {
    state.rows = [];
    localStorage.setItem(ACTIVE_SHOP_KEY, 'foreign-shop');

    const result = await renderMemberships();

    expect(result.current.activeShopId).toBeNull();
    expect(localStorage.getItem(ACTIVE_SHOP_KEY)).toBeNull();
  });
});
