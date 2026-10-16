import type { ShopId } from '@/lib/queryTypes';
export const uploadsKeys = {
  signedDownloadUrl: (shopId: ShopId, storagePath: string) =>
    ['signed-download-url', shopId, storagePath] as const,
};
