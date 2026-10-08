import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sheet, SheetBadge, SheetSection, useSheetClose } from '../components/Sheet';
import { ErrorState, InlineNotice, Skeleton } from '../components/feedback';
import { Button } from '../components/ui';
import { IconReceipt } from '../components/icons';
import {
  apiFetch,
  type ReceiptDetail,
  type VerifyReceiptBody,
  type VerifyReceiptOutcome,
} from '../lib/api';
import { getReceiptStatusLabel, getReceiptStatusTone } from '../lib/receiptStatus';
import { formatDate, formatMoney, formatQuantity, relativeTime } from '../lib/format';
import { useAuth, useCurrentShop, useShopMemberships } from '../lib/supabase';

/** Renders the OpenPencil "Modal / Receipt Detail" sheet from GET /receipts/:id. */
export function ReceiptDetailPage() {
  const { id = '' } = useParams();
  const { user, token } = useAuth();
  const { memberships, activeShopId } = useShopMemberships(user?.id);
  const shop = useCurrentShop(memberships, activeShopId);

  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  /** Kept apart from `error`: a failed verify belongs next to its button, not
   *  in the load-error slot whose retry only refetches the receipt. */
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  /** Same slot pattern as verify: a failed delete (e.g. a 409 race with a
   *  verification landing mid-click) belongs next to its button. */
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const currency = shop?.currency ?? 'USD';
  const close = useSheetClose('/catalog?tab=receipts');
  const navigate = useNavigate();
  const loadKey = `${token ?? ''}:${activeShopId ?? ''}:${reloadKey}`;
  // Verification is an owner/admin action server-side, so a member would only
  // ever earn a 403 from a button they could see.
  const role = memberships.find((row) => row.shopId === activeShopId)?.role;
  const canVerify = role === 'owner' || role === 'admin';

  useEffect(() => {
    if (!token || !activeShopId || !id) return;
    const controller = new AbortController();

    setLoading(true);
    setError(null);
    apiFetch<{ receipt: ReceiptDetail }>(`/receipts/${id}`, {
      token,
      shopId: activeShopId,
      signal: controller.signal,
    })
      .then((data) => setReceipt(data.receipt))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Could not load the receipt.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [loadKey, id]);

  // Only a receipt the worker is still chewing on gains lines asynchronously, so
  // only that one polls. `unverified` is terminal for the worker — it hands over
  // to a human and stops — so polling it would just spin until someone reviews.
  useEffect(() => {
    if (receipt?.status !== 'processing') return;
    const timer = setTimeout(() => setReloadKey((n) => n + 1), 3000);
    return () => clearTimeout(timer);
  }, [receipt?.status, reloadKey]);

  /**
   * Accepts every extracted line as the reviewer read it and lets the server do
   * the rest — inventory rows, weighted-average cost, and the analytics totals
   * all key off the `verified` status written in that one transaction. The sheet
   * flips to verified immediately so the button cannot be pressed twice while
   * the refetch is still in flight, then the refetch brings back the matched
   * lines and timestamps.
   */
  const verify = async () => {
    if (!token || !activeShopId || !id || verifying || !receipt) return;

    setVerifying(true);
    setVerifyError(null);
    const body: VerifyReceiptBody = {
      items: receipt.items.map((item) => ({ id: item.id, accepted: true })),
    };

    try {
      const outcome = await apiFetch<VerifyReceiptOutcome>(
        `/catalog/receipt/${id}/verify`,
        { method: 'POST', token, shopId: activeShopId, body },
      );
      setReceipt((prev) => (prev ? { ...prev, status: outcome.status } : prev));
      setReloadKey((n) => n + 1);
    } catch (cause) {
      setVerifyError(
        cause instanceof Error ? cause.message : 'Could not verify the receipt.',
      );
    } finally {
      setVerifying(false);
    }
  };

  const failureMessage = receipt?.status === 'failed' ? (receipt.errorMessage ?? null) : null;
  // A receipt can be denominated in a currency other than the shop's, so every
  // figure on this sheet has to follow the receipt, not the shop.
  const receiptCurrency = receipt?.currency ?? currency;
  // Status-split delete (DELETE /receipts/:id): pending/processing/unverified/
  // failed hard-delete the row + lines + R2 object, while verified is a 409 —
  // it already moved stock and counts as spend, with no reversal ledger. The
  // verified flag is the trusted disable signal, never inferred client-side.
  const isVerified = receipt?.status === 'verified';

  /**
   * Deletes an unverified receipt outright. Verified receipts never reach here
   * (the button is disabled), but a verification landing between render and
   * click still surfaces as a 409 next to the button instead of navigating.
   */
  const remove = async () => {
    if (!token || !activeShopId || !id || deleting || !receipt || isVerified) return;
    if (!window.confirm('Delete this receipt? Its lines and scan will be removed. This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      await apiFetch<{ ok: true }>(`/receipts/${id}`, {
        method: 'DELETE',
        token,
        shopId: activeShopId,
      });
      navigate('/catalog?tab=receipts', { replace: true });
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Could not delete the receipt.');
      setDeleting(false);
    }
  };

  return (
    <Sheet open onClose={close} label="Receipt details">
      <div className="flex flex-col gap-3 overflow-y-auto px-5 pb-5 pt-2">
        {error ? <ErrorState message={error} onRetry={() => setReloadKey((n) => n + 1)} /> : null}

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
                  Extracted, not reviewed. These numbers have not been added to
                  inventory yet.
                </InlineNotice>
                {verifyError ? <InlineNotice tone="error">{verifyError}</InlineNotice> : null}
                {canVerify && receipt.items.length > 0 ? (
                  <Button size="md" block loading={verifying} onClick={() => void verify()}>
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
                {receipt.items.some((item) => item.inventoryItemId !== null) ? (
                  <SheetBadge>
                    {receipt.items.filter((item) => item.inventoryItemId !== null).length} matched
                  </SheetBadge>
                ) : null}
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
                    Verified receipts already moved stock and count as spend — they cannot be deleted.
                  </InlineNotice>
                ) : null}
                {deleteError ? <InlineNotice tone="error">{deleteError}</InlineNotice> : null}
                <Button
                  variant="danger"
                  size="md"
                  block
                  loading={deleting}
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

/**
 * Receipts live in a private bucket. Rather than proxying bytes through the API,
 * the server signs a short-lived read URL and R2 serves the object directly.
 */
function SignedScan({
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
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token || !shopId) return;
    const controller = new AbortController();

    apiFetch<{ url: string; expiresIn: number }>('/uploads/download-url', {
      method: 'POST',
      token,
      shopId,
      signal: controller.signal,
      body: { path: storagePath },
    })
      .then((data) => setUrl(data.url))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setFailed(true);
      });

    return () => controller.abort();
  }, [token, shopId, storagePath]);

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

  return <img src={url} alt={filename ?? 'Receipt scan'} className="h-full w-full object-contain" />;
}