import { Skeleton } from '@/components/feedback';
import { useSignedScan } from './SignedScan.module';

export function SignedScan({
  token,
  shopId,
  storagePath,
  contentType,
  filename,
}: {
  token: string | null;
  shopId: string | null;
  storagePath: string;
  contentType: string | null;
  filename: string | null;
}) {
  const { failed, url } = useSignedScan({ token, shopId, storagePath, contentType, filename });
  if (failed) {
    return (
      <p className="px-6 text-center text-label text-ink-muted">
        The original scan could not be loaded.
      </p>
    );
  }
  if (!url) return <Skeleton className="h-full w-full rounded-none" />;
  if (contentType === 'application/pdf') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="pressable text-label font-medium text-ink underline"
      >
        Open {filename ?? 'PDF'}
      </a>
    );
  }
  return (
    <img src={url} alt={filename ?? 'Receipt scan'} className="h-full w-full object-contain" />
  );
}
