import type { ShopId, AuthenticatedContext } from '@/lib/queryTypes';
import { identityQueryKey } from '@/features/auth/environment';
export const receiptsKeys = {
  receipts: (identity: AuthenticatedContext, shopId: ShopId) =>
    identityQueryKey(identity, 'receipts', shopId),
  receipt: (identity: AuthenticatedContext, shopId: ShopId, id: string) =>
    identityQueryKey(identity, 'receipt', shopId, id),
};
