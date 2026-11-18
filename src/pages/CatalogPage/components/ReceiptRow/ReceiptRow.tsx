import type React from "react";
import { InlineNotice } from "@/components/feedback";
import type { Receipt } from "@/features/receipts/types";
import { formatDate, formatMoney } from "@/lib/format";
import { Link } from "react-router-dom";
import { ReceiptStatusPill } from "./ReceiptStatusPill/ReceiptStatusPill";
import { CatalogThumbnail } from "../CatalogThumbnail/CatalogThumbnail";
import "../CatalogCard.css";

interface IReceiptRow {
  receipt: Receipt;
  currency: string;
}

export const ReceiptRow: React.FC<IReceiptRow> = ({ receipt, currency }) => {
  const merchant = receipt.merchantName?.trim() || "Unknown merchant";
  const count = receipt.localUpload ? undefined : receipt.items?.length;
  return (
    <article className="catalog-card catalog-card--receipt">
      <Link
        to={`/catalog/receipts/${receipt.id}`}
        className="catalog-card__link"
      >
        <CatalogThumbnail receipt />
        <div className="catalog-card__body">
          <h2 className="catalog-card__title" title={merchant}>
            {merchant}
          </h2>
          <p className="catalog-card__metadata">
            {receipt.receiptDate
              ? formatDate(receipt.receiptDate)
              : "Date unavailable"}
          </p>
          <div className="catalog-card__receipt-footer">
            <p className="catalog-card__metadata">Items: {count ?? "—"}</p>
            <p className="catalog-card__amount catalog-card__receipt-total">
              {receipt.totalAmount != null && receipt.totalAmount !== ""
                ? formatMoney(receipt.totalAmount, receipt.currency ?? currency)
                : "—"}
            </p>
          </div>
        </div>
        {receipt.status === "failed" && receipt.errorMessage ? (
          <span className="sr-only">{receipt.errorMessage}</span>
        ) : null}
      </Link>
      {receipt.status === "failed" && receipt.errorMessage ? (
        <div className="px-3 pb-3">
          <InlineNotice tone="error">{receipt.errorMessage}</InlineNotice>
        </div>
      ) : null}
      <ReceiptStatusPill
        status={receipt.localUpload ? "uploading" : receipt.status}
      />
    </article>
  );
};
