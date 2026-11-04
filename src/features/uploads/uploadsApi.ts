import { uploadsKeys } from '@/features/uploads/keys';
import { apiFetch } from '@/lib/api';
import type { ShopId, AuthenticatedContext } from '@/lib/queryTypes';
import { enabled } from '@/lib/queryTypes';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export function signedDownloadOptions(
  identity: AuthenticatedContext,
  shopId: ShopId,
  storagePath: string,
) {
  return {
    queryKey: uploadsKeys.signedDownloadUrl(shopId, storagePath),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      apiFetch<{ url: string; expiresIn: number }>('/uploads/download-url', {
        method: 'POST',
        identity,
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
  identity: AuthenticatedContext,
  shopId: ShopId,
  storagePath: string,
): UseQueryResult<{ url: string; expiresIn: number }> {
  return useQuery({
    ...signedDownloadOptions(identity, shopId, storagePath),
    enabled: enabled(identity, shopId) && Boolean(storagePath),
  });
}
