import { Sheet, SheetBadge, SheetSection } from '@/components/Sheet/Sheet';
import { ErrorState, InlineNotice, Skeleton } from '@/components/feedback';
import { IconReceipt } from '@/components/icons';
import { Button } from '@/components/ui';
import { getReceiptStatusLabel, getReceiptStatusTone } from '@/features/receipts/receiptStatus';
import { formatDate, formatMoney, formatQuantity, relativeTime } from '@/lib/format';
import { useReceiptDetailPage } from './ReceiptDetailPage.module';
import { SignedScan } from './SignedScan/SignedScan';

export function ReceiptDetailPage() {
  const {
    matchedItemCount,
    token,
    activeShopId,
    receipt,
    verifyError,
    deleteError,
    loading,
    error,
    close,
    canVerify,
    verify,
    failureMessage,
    receiptCurrency,
    isVerified,
    remove,
    handleRetry,
    verifyPending,
    deletePending,
  } = useReceiptDetailPage();
  return (
    <Sheet open onClose={close} label="Receipt details">
      <div className="flex flex-col gap-3 overflow-y-auto px-5 pb-5 pt-2">
        {error ? <ErrorState message={error} onRetry={() => void handleRetry()} /> : null}

        {loading && !receipt ? (
          <>
            <Skeleton className="h-[88px]" />
            <Skeleton className="h-40" />
            <Skeleton className="h-28" />
          </>
        ) : receipt ? (
          <>
            <div className="flex items-center gap-3 rounded-card bg-surface-card p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-eyebrow font-medium uppercase text-ink-muted">Receipt</p>
                <p className="truncate font-display text-card-value text-ink">
                  {receipt.merchantName ?? 'Unnamed merchant'}
                </p>
                <p className="text-label font-medium text-ink-muted">
                  {formatDate(receipt.receiptDate ?? receipt.createdAt)} · {receipt.items.length}{' '}
                  {receipt.items.length === 1 ? 'item' : 'items'}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <p className="text-eyebrow font-medium uppercase text-ink-muted">Total</p>
                <p className="font-display text-card-value text-brand-primary">
                  {formatMoney(receipt.totalAmount, receiptCurrency)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SheetBadge tone={getReceiptStatusTone(receipt.status) ?? 'card'}>
                {getReceiptStatusLabel(receipt.status)}
              </SheetBadge>
              {receipt.processedAt ? (
                <span className="text-label text-ink-muted-soft">
                  Processed {relativeTime(receipt.processedAt)}
                </span>
              ) : null}
            </div>

            {/* The only state that hands control back to a person, so it owns
                both the explanation and the action that clears it. */}
            {receipt.status === 'unverified' ? (
              <div className="flex flex-col gap-2.5">
                <InlineNotice>
                  Extracted, not reviewed. These numbers have not been added to inventory yet.
                </InlineNotice>
                {verifyError ? <InlineNotice tone="error">{verifyError}</InlineNotice> : null}
                {canVerify && receipt.items.length > 0 ? (
                  <Button size="md" block loading={verifyPending} onClick={() => void verify()}>
                    Verify receipt
                  </Button>
                ) : null}
              </div>
            ) : null}

            {failureMessage ? <InlineNotice tone="error">{failureMessage}</InlineNotice> : null}

            <SheetSection title="Expense tags">
              <div className="flex flex-wrap gap-2">
                <SheetBadge tone="teal">Ingredients</SheetBadge>
                {/* Only verification links a line to inventory, so an unreviewed
                    receipt has zero matches. "0 matched" would read as a
                    failure when it is really just "nobody has looked yet". */}
                {matchedItemCount > 0 ? <SheetBadge>{matchedItemCount} matched</SheetBadge> : null}
                {receipt.taxAmount ? <SheetBadge>Tax included</SheetBadge> : null}
              </div>
            </SheetSection>

            <SheetSection title="Line items">
              {receipt.items.length === 0 ? (
                <p className="text-body text-ink-muted">
                  {receipt.status === 'pending' || receipt.status === 'processing'
                    ? 'Waiting for extraction to finish.'
                    : 'No line items were extracted.'}
                </p>
              ) : (
                <ul className="flex flex-col">
                  {receipt.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 border-b border-hairline-soft py-2 last:border-b-0"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-body text-ink">{item.rawName}</span>
                        <span className="text-label font-medium text-ink-muted">
                          {formatQuantity(item.quantity)} ×{' '}
                          {item.unitPrice === null || item.unitPrice === undefined
                            ? '—'
                            : formatMoney(item.unitPrice, receiptCurrency)}
                        </span>
                      </div>
                      <span className="shrink-0 text-[16px] font-medium text-ink">
                        {item.totalPrice === null || item.totalPrice === undefined
                          ? '—'
                          : formatMoney(item.totalPrice, receiptCurrency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SheetSection>

            <SheetSection title="Original scan">
              <div className="flex h-[150px] items-center justify-center overflow-hidden rounded-card bg-surface-cream-strong">
                {receipt.storagePath ? (
                  <SignedScan
                    token={token}
                    shopId={activeShopId}
                    storagePath={receipt.storagePath}
                    contentType={receipt.contentType}
                    filename={receipt.originalFilename}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 px-6 text-center">
                    <IconReceipt className="h-7 w-7 text-ink-muted-soft" />
                    <p className="text-label text-ink-muted">
                      The scan is stored privately and opens in a new tab.
                    </p>
                  </div>
                )}
              </div>
            </SheetSection>

            {/* Delete is owner/admin-only server-side (mutationGuards), so
                members never see a button that would only earn them a 403.
                Verified is the disable signal: it already moved stock and
                counts as spend, so the backend answers 409 and the button
                stays disabled with the reason beside it. */}
            {canVerify ? (
              <div className="flex flex-col gap-2.5">
                {isVerified ? (
                  <InlineNotice>
                    Verified receipts already moved stock and count as spend — they cannot be
                    deleted.
                  </InlineNotice>
                ) : null}
                {deleteError ? <InlineNotice tone="error">{deleteError}</InlineNotice> : null}
                <Button
                  variant="danger"
                  size="md"
                  block
                  loading={deletePending}
                  disabled={isVerified}
                  title={isVerified ? 'Verified receipts cannot be deleted' : undefined}
                  onClick={() => void remove()}
                >
                  Delete receipt
                </Button>
              </div>
            ) : null}
          </>
        ) : !error ? (
          <Skeleton className="h-[88px]" />
        ) : null}
      </div>
    </Sheet>
  );
}
