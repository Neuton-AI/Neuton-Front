import { useSheetClose } from '@/components/Sheet/Sheet.module';
import { useAuth, useCurrentShop, useShopMemberships } from '@/features/auth/supabase';
import { useDeleteReceipt, useReceipt, useVerifyReceipt } from '@/features/receipts/receiptsApi';
import type { VerifyReceiptBody } from '@/features/receipts/types';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function useReceiptDetailPage() {
  const { id = '' } = useParams();

  const { user, token } = useAuth();

  const { memberships, activeShopId } = useShopMemberships(user?.id);

  const shop = useCurrentShop(memberships, activeShopId);

  const receiptQuery = useReceipt(token, activeShopId, id);

  const receipt = receiptQuery.data?.receipt ?? null;

  const verifyMutation = useVerifyReceipt(token, activeShopId);

  const deleteMutation = useDeleteReceipt(token, activeShopId);

  /** Kept apart from `error`: a failed verify belongs next to its button, not
   *  in the load-error slot whose retry only refetches the receipt. */
  const [verifyError, setVerifyError] = useState<string | null>(null);

  /** Same slot pattern as verify: a failed delete (e.g. a 409 race with a
   *  verification landing mid-click) belongs next to its button. */
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loading = receiptQuery.isLoading && !receipt;

  const error = receiptQuery.error
    ? receiptQuery.error instanceof Error
      ? receiptQuery.error.message
      : 'Could not load the receipt.'
    : null;

  const currency = shop?.currency ?? 'USD';

  const close = useSheetClose('/catalog?tab=receipts');

  const navigate = useNavigate();

  // Verification is an owner/admin action server-side, so a member would only
  // ever earn a 403 from a button they could see.
  const role = memberships.find((row) => row.shopId === activeShopId)?.role;

  const canVerify = role === 'owner' || role === 'admin';

  // Polling while the worker is still chewing is baked into the query hook:
  // only `processing` keeps a quiet 3s refetch. `unverified` is terminal for
  // the worker — it hands over to a human and stops — so it never polls.

  /**
   * Accepts every extracted line as the reviewer read it and lets the server do
   * the rest — inventory rows, weighted-average cost, and the analytics totals
   * all key off the `verified` status written in that one transaction. The sheet
   * flips to verified immediately so the button cannot be pressed twice while
   * the refetch is still in flight, then the refetch brings back the matched
   * lines and timestamps.
   */
  const verify = async () => {
    if (!token || !activeShopId || !id || !canVerify || verifyMutation.isPending || !receipt)
      return;

    setVerifyError(null);
    const body: VerifyReceiptBody = {
      items: receipt.items.map((item) => ({ id: item.id, accepted: true })),
    };
    try {
      await verifyMutation.mutateAsync({ id, body });
    } catch (cause) {
      setVerifyError(cause instanceof Error ? cause.message : 'Could not verify the receipt.');
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
    if (
      !token ||
      !activeShopId ||
      !id ||
      !canVerify ||
      deleteMutation.isPending ||
      !receipt ||
      isVerified
    )
      return;
    if (
      !window.confirm(
        'Delete this receipt? Its lines and scan will be removed. This cannot be undone.',
      )
    ) {
      return;
    }

    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync({ id });
      navigate('/catalog?tab=receipts', { replace: true });
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Could not delete the receipt.');
    }
  };
  const handleRetry = () => {
    void receiptQuery.refetch();
  };
  const verifyPending = verifyMutation.isPending;
  const deletePending = deleteMutation.isPending;
  const matchedItemCount =
    receipt?.items.filter((item) => item.inventoryItemId !== null).length ?? 0;
  return {
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
  };
}
export type ReceiptDetailPageModel = ReturnType<typeof useReceiptDetailPage>;
