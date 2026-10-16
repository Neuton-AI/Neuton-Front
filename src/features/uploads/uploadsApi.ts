import { uploadsKeys } from '@/features/uploads/keys';
import { apiFetch } from '@/lib/api';
import type { ShopId, Token } from '@/lib/queryTypes';
import { enabled } from '@/lib/queryTypes';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export function useSignedDownloadUrl(
  token: Token,
  shopId: ShopId,
  storagePath: string,
): UseQueryResult<{ url: string; expiresIn: number }> {
  return useQuery({
    queryKey: uploadsKeys.signedDownloadUrl(shopId, storagePath),
    queryFn: ({ signal }) =>
      apiFetch<{ url: string; expiresIn: number }>('/uploads/download-url', {
        method: 'POST',
        token,
        shopId,
        signal,
        body: { path: storagePath },
      }),
    enabled: enabled(token, shopId) && Boolean(storagePath),
  });
}
