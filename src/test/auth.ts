import { vi } from 'vitest';
import { buildShop } from './factories/shops.factory';

export const authState = {
  token: 'token-1' as string | null,
  activeShopId: 'shop-1' as string | null,
  role: 'owner' as 'owner' | 'admin' | 'member',
  loading: false,
  shop: buildShop(),
  hasMembership: true,
};
export const selectShop = vi.fn();
export const reloadMemberships = vi.fn(async () => {});
export const signOut = vi.fn(async () => ({ error: null }));
export const authMock = {
  supabase: { auth: { signOut } },
  isSupabaseConfigured: true,
  useAuth: () => ({
    user: { id: 'u1', email: 'testtest@gmail.com' },
    token: authState.token,
    loading: authState.loading,
  }),
  useShopMemberships: () => ({
    memberships: authState.hasMembership
      ? [{ shopId: 'shop-1', role: authState.role, shops: authState.shop }]
      : [],
    activeShopId: authState.activeShopId,
    loading: authState.loading,
    error: null,
    setActiveShopId: selectShop,
    reload: reloadMemberships,
  }),
  useCurrentShop: () => (authState.hasMembership ? authState.shop : null),
};
export function resetAuth() {
  Object.assign(authState, {
    token: 'token-1',
    activeShopId: 'shop-1',
    role: 'owner',
    loading: false,
    shop: buildShop(),
    hasMembership: true,
  });
  selectShop.mockReset();
  reloadMemberships.mockClear();
  signOut.mockReset().mockResolvedValue({ error: null });
}
