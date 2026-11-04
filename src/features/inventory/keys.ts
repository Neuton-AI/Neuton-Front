import type { ShopId, AuthenticatedContext } from '@/lib/queryTypes';
import { identityQueryKey } from '@/features/auth/environment';
export const inventoryKeys = {
  inventory: (identity: AuthenticatedContext, shopId: ShopId) =>
    identityQueryKey(identity, 'inventory', shopId),
};
