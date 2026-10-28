import { Sheet, SheetSection } from '@/components/Sheet/Sheet';
import { ErrorState, InlineNotice, Skeleton } from '@/components/feedback';
import { IconEdit, IconReceipt, IconTrash } from '@/components/icons';
import { formatDate, formatMoney, formatQuantity } from '@/lib/format';
import { useReceiptDetailPage } from './ReceiptDetailPage.module';
import { ReceiptDetailStatus, ReceiptStatusIcon } from './ReceiptDetailStatus';
import { DocumentSources } from '@/components/DocumentSources/DocumentSources';
import { ReceiptMerchantEditor } from './ReceiptMerchantEditor';

const actionClassName =
  'inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-card text-body font-semibold';

export function ReceiptDetailPage() {
  const {
    token,
    activeShopId,
    receipt,
    verifyError,
    loading,
    error,
    close,
    canVerify,
    verify,
    failureMessage,
    receiptCurrency,
    isVerified,
    handleRetry,
    verifyPending,
  } = useReceiptDetailPage();

  return (
    <Sheet open fillHeight onClose={close} label="Receipt details">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-3 pt-2">
        {error ? <ErrorState message={error} onRetry={() => void handleRetry()} /> : null}
        {loading && !receipt ? (
          <>
            <Skeleton className="h-[144px] shrink-0" />
            <Skeleton className="h-40 shrink-0" />
            <Skeleton className="h-28 shrink-0" />
          </>
        ) : receipt ? (
          <>
            <div className="flex shrink-0 items-center gap-3 rounded-card bg-surface-card p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-eyebrow font-medium uppercase text-ink-muted">Receipt</p>
                <h1 className="break-words font-display text-card-value text-ink">
                  {receipt.merchantName?.trim() || 'Unknown merchant'}
                </h1>
                <p className="text-label font-medium text-ink-muted">
                  {receipt.receiptDate ? formatDate(receipt.receiptDate) : 'Date unavailable'} ·{' '}
                  {receipt.items.length} {receipt.items.length === 1 ? 'item' : 'items'}
                </p>
              </div>
              <div className="flex max-w-[45%] shrink-0 flex-col items-end gap-0.5">
                <p className="text-eyebrow font-medium uppercase text-ink-muted">Total</p>
                <p className="break-all text-right font-display text-card-value text-brand-primary">
                  {receipt.totalAmount != null && receipt.totalAmount !== ''
                    ? formatMoney(receipt.totalAmount, receiptCurrency)
                    : '—'}
                </p>
              </div>
            </div>
            {canVerify && (receipt.status === 'unverified' || isVerified) ? (
              <ReceiptMerchantEditor
                key={`${receipt.id}:${receipt.merchantName}`}
                receipt={receipt}
                token={token}
                shopId={activeShopId}
              />
            ) : null}
            {failureMessage ? <InlineNotice tone="error">{failureMessage}</InlineNotice> : null}
            <section
              aria-labelledby="receipt-line-items"
              className="flex flex-1 shrink-0 flex-col gap-1.5"
            >
              <div className="flex items-center justify-between gap-3 pb-0.5">
                <h2
                  id="receipt-line-items"
                  className="text-[18px] font-medium leading-[25px] text-ink"
                >
                  Line items
                </h2>
                <ReceiptDetailStatus status={receipt.status} />
              </div>
              {receipt.status === 'unverified' ? (
                <p id="receipt-review-description" className="sr-only">
                  Extracted, not reviewed. These numbers have not been added to inventory yet.
                </p>
              ) : null}
              {receipt.items.length === 0 ? (
                <p className="text-body text-ink-muted">
                  {receipt.status === 'pending' || receipt.status === 'processing'
                    ? 'Waiting for extraction to finish.'
                    : 'No line items were extracted.'}
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {receipt.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 border-b border-hairline-soft py-2"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="break-words text-[14px] leading-[155%] text-ink">
                          {item.rawName}
                        </span>
                        <span className="text-label font-medium text-ink-muted">
                          {formatQuantity(item.quantity)} ×{' '}
                          {item.unitPrice === null || item.unitPrice === undefined
                            ? '—'
                            : formatMoney(item.unitPrice, receiptCurrency)}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[16px] font-medium leading-[140%] text-ink">
                          {item.totalPrice === null || item.totalPrice === undefined
                            ? '—'
                            : formatMoney(item.totalPrice, receiptCurrency)}
                        </span>
                        {receipt.status === 'unverified' && canVerify ? (
                          <button
                            type="button"
                            disabled
                            aria-label={`Delete ${item.rawName}`}
                            title="Line item deletion is coming soon"
                            className="flex h-8 w-8 shrink-0 cursor-not-allowed items-center justify-center text-ink-muted-soft"
                          >
                            <IconTrash className="h-[18px] w-[18px]" strokeWidth={1.5} />
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <div className="shrink-0">
              <SheetSection title="Original scan">
                {receipt.sources?.length || receipt.storagePath ? (
                  <DocumentSources
                    token={token}
                    shopId={activeShopId}
                    sources={
                      receipt.sources?.length
                        ? receipt.sources
                        : [
                            {
                              sourceId: receipt.id,
                              storagePath: receipt.storagePath!,
                              contentType: receipt.contentType ?? 'image/jpeg',
                              originalFilename: receipt.originalFilename,
                            },
                          ]
                    }
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 px-6 text-center">
                    <IconReceipt className="h-7 w-7 text-ink-muted-soft" />
                    <p className="text-label text-ink-muted">No original scan is available.</p>
                  </div>
                )}
              </SheetSection>
            </div>
          </>
        ) : !error ? (
          <Skeleton className="h-[144px]" />
        ) : null}
      </div>
      {receipt && canVerify && (isVerified || receipt.status === 'unverified') ? (
        <div className="flex shrink-0 flex-col gap-3 px-5">
          {verifyError ? <InlineNotice tone="error">{verifyError}</InlineNotice> : null}
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled
              title="Receipt editing is coming soon"
              className={`${actionClassName} cursor-not-allowed border border-hairline bg-surface-canvas text-ink`}
            >
              <IconEdit className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
              Edit Receipt
            </button>
            {isVerified ? (
              <button
                type="button"
                disabled
                title="Receipt deletion is coming soon"
                className={`${actionClassName} cursor-not-allowed bg-[#F6DEDA] text-[#A63B3B]`}
              >
                <IconTrash className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                Delete Receipt
              </button>
            ) : (
              <button
                type="button"
                disabled={verifyPending || receipt.items.length === 0}
                aria-busy={verifyPending}
                aria-describedby="receipt-review-description"
                onClick={() => void verify()}
                className={`${actionClassName} pressable bg-brand-teal text-ink disabled:cursor-not-allowed disabled:opacity-45`}
              >
                <ReceiptStatusIcon verified className="h-[18px] w-[18px] shrink-0" />
                {verifyPending ? 'Verifying…' : 'Verify Receipt'}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
