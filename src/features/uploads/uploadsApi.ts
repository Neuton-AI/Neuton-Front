import { uploadsKeys } from '@/features/uploads/keys';
import { apiFetch } from '@/lib/api';
import type { ShopId, Token } from '@/lib/queryTypes';
import { enabled } from '@/lib/queryTypes';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export function signedDownloadOptions(token: Token, shopId: ShopId, storagePath: string) {
  return {
    queryKey: uploadsKeys.signedDownloadUrl(shopId, storagePath),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      apiFetch<{ url: string; expiresIn: number }>('/uploads/download-url', {
        method: 'POST',
        token,
        shopId,
        signal,
        body: { path: storagePath },
      }),
    // URLs expire after an hour. Refresh well before expiry, including on original clicks.
    staleTime: 50 * 60 * 1000,
    gcTime: 50 * 60 * 1000,
  };
}

export function useSignedDownloadUrl(
  token: Token,
  shopId: ShopId,
  storagePath: string,
): UseQueryResult<{ url: string; expiresIn: number }> {
  return useQuery({
    ...signedDownloadOptions(token, shopId, storagePath),
    enabled: enabled(token, shopId) && Boolean(storagePath),
  });
}
