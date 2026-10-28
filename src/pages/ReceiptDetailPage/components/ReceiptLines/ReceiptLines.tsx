import type React from "react";
import { IconTrash } from "@/components/icons";
import { formatMoney, formatQuantity } from "@/lib/format";
import type { ReceiptDetailPageModel } from "../../ReceiptDetailPage.module";
import { ReceiptDetailStatus } from "../ReceiptDetailStatus/ReceiptDetailStatus";

type Receipt = NonNullable<ReceiptDetailPageModel["receipt"]>;

interface IReceiptLines {
  receipt: Receipt;
  currency: string;
  canVerify: boolean;
}

export const ReceiptLines: React.FC<IReceiptLines> = ({
  receipt,
  currency,
  canVerify,
}) => {
  return (
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
      {receipt.status === "unverified" ? (
        <p id="receipt-review-description" className="sr-only">
          Extracted, not reviewed. These numbers have not been added to
          inventory yet.
        </p>
      ) : null}
      {receipt.items.length === 0 ? (
        <p className="text-body text-ink-muted">
          {receipt.status === "pending" || receipt.status === "processing"
            ? "Waiting for extraction to finish."
            : "No line items were extracted."}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {receipt.items.map((item) => (
            <ReceiptLine
              key={item.id}
              item={item}
              currency={currency}
              canDelete={receipt.status === "unverified" && canVerify}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

interface IReceiptLine {
  item: Receipt["items"][number];
  currency: string;
  canDelete: boolean;
}

const ReceiptLine: React.FC<IReceiptLine> = ({ item, currency, canDelete }) => {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-hairline-soft py-2">
      <div className="flex min-w-0 flex-col">
        <span className="break-words text-[14px] leading-[155%] text-ink">
          {item.rawName}
        </span>
        <span className="text-label font-medium text-ink-muted">
          {formatQuantity(item.quantity)} ×{" "}
          {item.unitPrice === null || item.unitPrice === undefined
            ? "—"
            : formatMoney(item.unitPrice, currency)}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[16px] font-medium leading-[140%] text-ink">
          {item.totalPrice === null || item.totalPrice === undefined
            ? "—"
            : formatMoney(item.totalPrice, currency)}
        </span>
        {canDelete ? (
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
  );
};
