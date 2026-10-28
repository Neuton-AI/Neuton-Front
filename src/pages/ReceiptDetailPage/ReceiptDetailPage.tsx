import type React from "react";
import { Sheet } from "@/components/Sheet/Sheet";
import { ErrorState, InlineNotice, Skeleton } from "@/components/feedback";
import { ReceiptActions } from "./components/ReceiptActions/ReceiptActions";
import { useReceiptDetailPage } from "./ReceiptDetailPage.module";
import { ReceiptLines } from "./components/ReceiptLines/ReceiptLines";
import { ReceiptMerchantEditor } from "./components/ReceiptMerchantEditor/ReceiptMerchantEditor";
import { ReceiptScan } from "./components/ReceiptScan/ReceiptScan";
import { ReceiptSummary } from "./components/ReceiptSummary/ReceiptSummary";

export const ReceiptDetailPage: React.FC = () => {
  const model = useReceiptDetailPage();
  const { receipt, loading, error } = model;
  return (
    <Sheet open fillHeight onClose={model.close} label="Receipt details">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-3 pt-2">
        {error ? (
          <ErrorState
            message={error}
            onRetry={() => void model.handleRetry()}
          />
        ) : null}
        {loading && !receipt ? (
          <>
            <Skeleton className="h-[144px] shrink-0" />
            <Skeleton className="h-40 shrink-0" />
            <Skeleton className="h-28 shrink-0" />
          </>
        ) : receipt ? (
          <>
            <ReceiptSummary
              receipt={receipt}
              currency={model.receiptCurrency}
            />
            {model.canVerify &&
            (receipt.status === "unverified" || model.isVerified) ? (
              <ReceiptMerchantEditor
                key={`${receipt.id}:${receipt.merchantName}`}
                receipt={receipt}
                token={model.token}
                shopId={model.activeShopId}
              />
            ) : null}
            {model.failureMessage ? (
              <InlineNotice tone="error">{model.failureMessage}</InlineNotice>
            ) : null}
            <ReceiptLines
              receipt={receipt}
              currency={model.receiptCurrency}
              canVerify={model.canVerify}
            />
            <ReceiptScan
              receipt={receipt}
              token={model.token}
              shopId={model.activeShopId}
            />
          </>
        ) : !error ? (
          <Skeleton className="h-[144px]" />
        ) : null}
      </div>
      <ReceiptActions model={model} />
    </Sheet>
  );
};
