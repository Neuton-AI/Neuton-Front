import type { ShopId, AuthenticatedContext } from '@/lib/queryTypes';
import { identityQueryKey } from '@/features/auth/environment';
export const uploadsKeys = {
  signedDownloadUrl: (
    identity: AuthenticatedContext,
    shopId: ShopId,
    path: string,
  ) => identityQueryKey(identity, 'signed-download-url', shopId, path),
};
