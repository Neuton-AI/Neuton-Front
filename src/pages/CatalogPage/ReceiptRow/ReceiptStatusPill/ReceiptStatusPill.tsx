import {
  getReceiptStatusLabel,
  RECEIPT_STATUS_PILL_STYLES,
} from '@/features/receipts/receiptStatus';
import type { Receipt } from '@/features/receipts/types';
export function ReceiptStatusPill({ status }: { status: Receipt['status'] }) {
  return (
    <span
      className={`shrink-0 rounded-pill px-2 py-0.5 text-label font-medium ${
        RECEIPT_STATUS_PILL_STYLES[status]
      }`}
    >
      {getReceiptStatusLabel(status)}
    </span>
  );
}
