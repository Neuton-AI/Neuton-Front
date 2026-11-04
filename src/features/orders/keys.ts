import type { StatusFilter } from './types';
import type { ShopId, AuthenticatedContext } from '@/lib/queryTypes';
import { identityQueryKey } from '@/features/auth/environment';
export const ordersKeys = {
  orders: (
    identity: AuthenticatedContext,
    shopId: ShopId,
    status: StatusFilter,
  ) => identityQueryKey(identity, 'orders', shopId, status),
  ordersRoot: (identity: AuthenticatedContext) =>
    identityQueryKey(identity, 'orders'),
  order: (identity: AuthenticatedContext, shopId: ShopId, id: string) =>
    identityQueryKey(identity, 'order', shopId, id),
};
