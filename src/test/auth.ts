import { vi } from 'vitest';
import { buildShop } from './factories/shops.factory';

export const authState = {
  userId: 'userId-1' as string | null,
  activeShopId: 'shop-1' as string | null,
  role: 'owner' as 'owner' | 'admin' | 'member',
  loading: false,
  shop: buildShop(),
  hasMembership: true,
};
export const selectShop = vi.fn();
export const reloadMemberships = vi.fn(async () => {});
export const signOut = vi.fn();
export const authMock = {
  signOut,
  useAuth: () => ({
    user: { id: 'u1', email: 'testtest@gmail.com' },
    userId: authState.userId,
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
    userId: 'userId-1',
    activeShopId: 'shop-1',
    role: 'owner',
    loading: false,
    shop: buildShop(),
    hasMembership: true,
  });
  selectShop.mockReset();
  reloadMemberships.mockClear();
  signOut.mockReset();
}
