import { DocumentSources } from '@/components/DocumentSources/DocumentSources';
import { SheetSection } from '@/components/Sheet/Sheet';
import { IconReceipt } from '@/components/icons';
import type { DocumentSource } from '@/features/uploads/types';
import type { ReceiptDetailPageModel } from '../ReceiptDetailPage.module';

type Receipt = NonNullable<ReceiptDetailPageModel['receipt']>;

export function ReceiptScan({
  receipt,
  token,
  shopId,
}: {
  receipt: Receipt;
  token: string | null;
  shopId: string | null;
}) {
  const sources: DocumentSource[] = receipt.sources?.length
    ? receipt.sources
    : receipt.storagePath
      ? [
          {
            sourceId: receipt.id,
            storagePath: receipt.storagePath,
            contentType: receipt.contentType ?? 'image/jpeg',
            originalFilename: receipt.originalFilename,
          },
        ]
      : [];
  return (
    <div className="shrink-0">
      <SheetSection title="Original scan">
        {sources.length ? (
          <DocumentSources token={token} shopId={shopId} sources={sources} />
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            <IconReceipt className="h-7 w-7 text-ink-muted-soft" />
            <p className="text-label text-ink-muted">No original scan is available.</p>
          </div>
        )}
      </SheetSection>
    </div>
  );
}
