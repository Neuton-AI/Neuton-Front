import {
  getReceiptStatusLabel,
  RECEIPT_STATUS_PILL_STYLES,
} from '@/features/receipts/receiptStatus';
import type { Recipe } from '@/features/recipes/types';
export function RecipeStatusPill({ status }: { status: Recipe['status'] }) {
  if (!status) return null;
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
