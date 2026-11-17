import type React from "react";
import type { CatalogPageModel } from "../../CatalogPage.module";
import { ReceiptRow } from "../ReceiptRow/ReceiptRow";

interface ICatalogReceipts {
  model: CatalogPageModel;
}

export const CatalogReceipts: React.FC<ICatalogReceipts> = ({ model }) => {
  if (model.errors.receipts) return null;
  return (
    <>
      {model.receipts.map((receipt) => (
        <ReceiptRow
          key={receipt.id}
          receipt={receipt}
          currency={model.currency}
        />
      ))}
    </>
  );
};
