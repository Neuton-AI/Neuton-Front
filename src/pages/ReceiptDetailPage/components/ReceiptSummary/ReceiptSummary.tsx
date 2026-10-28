import type React from "react";
import { formatDate, formatMoney } from "@/lib/format";
import type { ReceiptDetailPageModel } from "../../ReceiptDetailPage.module";

type Receipt = NonNullable<ReceiptDetailPageModel["receipt"]>;

interface IReceiptSummary {
  receipt: Receipt;
  currency: string;
}

export const ReceiptSummary: React.FC<IReceiptSummary> = ({
  receipt,
  currency,
}) => {
  return (
    <div className="flex shrink-0 items-center gap-3 rounded-card bg-surface-card p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-eyebrow font-medium uppercase text-ink-muted">
          Receipt
        </p>
        <h1 className="break-words font-display text-card-value text-ink">
          {receipt.merchantName?.trim() || "Unknown merchant"}
        </h1>
        <p className="text-label font-medium text-ink-muted">
          {receipt.receiptDate
            ? formatDate(receipt.receiptDate)
            : "Date unavailable"}{" "}
          · {receipt.items.length}{" "}
          {receipt.items.length === 1 ? "item" : "items"}
        </p>
      </div>
      <div className="flex max-w-[45%] shrink-0 flex-col items-end gap-0.5">
        <p className="text-eyebrow font-medium uppercase text-ink-muted">
          Total
        </p>
        <p className="break-all text-right font-display text-card-value text-brand-primary">
          {receipt.totalAmount != null && receipt.totalAmount !== ""
            ? formatMoney(receipt.totalAmount, currency)
            : "—"}
        </p>
      </div>
    </div>
  );
};
