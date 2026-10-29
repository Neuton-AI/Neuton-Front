import { useSheetClose } from "@/components/Sheet/Sheet.module";
import {
  useAuth,
  useCurrentShop,
  useShopMemberships,
} from "@/features/auth/supabase";
import { useReceipt, useVerifyReceipt } from "@/features/receipts/receiptsApi";
import type { VerifyReceiptBody } from "@/features/receipts/types";
import { useState } from "react";
import { useParams } from "react-router-dom";

export function useReceiptDetailPage() {
  const { id = "" } = useParams();

  const { user, token } = useAuth();

  const { memberships, activeShopId } = useShopMemberships(user?.id);

  const shop = useCurrentShop(memberships, activeShopId);

  const receiptQuery = useReceipt(token, activeShopId, id);

  const receipt = receiptQuery.data?.receipt ?? null;

  const verifyMutation = useVerifyReceipt(token, activeShopId);

  /** Kept apart from `error`: a failed verify belongs next to its button, not
   *  in the load-error slot whose retry only refetches the receipt. */
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const loading = receiptQuery.isLoading && !receipt;

  const error = receiptQuery.error
    ? receiptQuery.error instanceof Error
      ? receiptQuery.error.message
      : "Could not load the receipt."
    : null;

  const currency = shop?.currency ?? "USD";

  const close = useSheetClose("/catalog?tab=receipts");

  // Verification is an owner/admin action server-side, so a member would only
  // ever earn a 403 from a button they could see.
  const role = memberships.find((row) => row.shopId === activeShopId)?.role;

  const canVerify = role === "owner" || role === "admin";

  // Worker updates arrive through the shop event stream and refresh local queries.

  /**
   * Accepts every extracted line as the reviewer read it and lets the server do
   * the rest — inventory rows, weighted-average cost, and the analytics totals
   * all key off the `verified` status written in that one transaction. The sheet
   * flips to verified immediately so the button cannot be pressed twice while
   * the refetch is still in flight, then the refetch brings back the matched
   * lines and timestamps.
   */
  const verify = async () => {
    if (
      !token ||
      !activeShopId ||
      !id ||
      !canVerify ||
      verifyMutation.isPending ||
      !receipt
    )
      return;

    setVerifyError(null);
    const body: VerifyReceiptBody = {
      items: receipt.items.map((item) => ({ id: item.id, accepted: true })),
    };
    try {
      await verifyMutation.mutateAsync({ id, body });
    } catch (cause) {
      setVerifyError(
        cause instanceof Error
          ? cause.message
          : "Could not verify the receipt.",
      );
    }
  };

  const failureMessage =
    receipt?.status === "failed" ? (receipt.errorMessage ?? null) : null;

  // A receipt can be denominated in a currency other than the shop's, so every
  // figure on this sheet has to follow the receipt, not the shop.
  const receiptCurrency = receipt?.currency ?? currency;

  const isVerified = receipt?.status === "verified";

  const handleRetry = () => {
    void receiptQuery.refetch();
  };
  const verifyPending = verifyMutation.isPending;
  return {
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
  };
}
export type ReceiptDetailPageModel = ReturnType<typeof useReceiptDetailPage>;
