import type React from "react";
import {
  getReceiptStatusLabel,
  RECEIPT_STATUS_PILL_STYLES,
} from "@/features/receipts/receiptStatus";
import type { Receipt } from "@/features/receipts/types";
interface IReceiptStatusPill {
  status: Receipt["status"];
}

export const ReceiptStatusPill: React.FC<IReceiptStatusPill> = ({ status }) => {
  return (
    <span
      className={`shrink-0 rounded-pill px-2 py-0.5 text-label font-medium ${
        RECEIPT_STATUS_PILL_STYLES[status]
      }`}
    >
      {getReceiptStatusLabel(status)}
    </span>
  );
};
