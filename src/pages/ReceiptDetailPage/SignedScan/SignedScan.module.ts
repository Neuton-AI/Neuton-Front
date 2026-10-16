import { useSignedDownloadUrl } from '@/features/uploads/uploadsApi';

export function useSignedScan({
  token,
  shopId,
  storagePath,
}: {
  token: string | null;
  shopId: string | null;
  storagePath: string;
  contentType: string | null;
  filename: string | null;
}) {
  const signedQuery = useSignedDownloadUrl(token, shopId, storagePath);

  const failed = signedQuery.error != null;

  const url = signedQuery.data?.url ?? null;

  return { failed, url };
}
export type SignedScanModel = ReturnType<typeof useSignedScan>;
