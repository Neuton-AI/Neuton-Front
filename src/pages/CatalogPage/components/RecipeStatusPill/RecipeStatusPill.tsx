import type React from "react";
import {
  getReceiptStatusLabel,
  RECEIPT_STATUS_PILL_STYLES,
} from "@/features/receipts/receiptStatus";
import type { Recipe } from "@/features/recipes/types";
interface IRecipeStatusPill {
  status: Recipe["status"];
}

export const RecipeStatusPill: React.FC<IRecipeStatusPill> = ({ status }) => {
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
};
