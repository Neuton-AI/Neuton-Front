import type { ShopId, AuthenticatedContext } from '@/lib/queryTypes';
import { identityQueryKey } from '@/features/auth/environment';
export const shopsKeys = {
  shop: (identity: AuthenticatedContext, shopId: ShopId) =>
    identityQueryKey(identity, 'shop', shopId),
};
