import type React from "react";
import {
  CatalogStatusTag,
  type CatalogStatus,
} from "../../CatalogStatusTag/CatalogStatusTag";

export const ReceiptStatusPill: React.FC<{ status: CatalogStatus }> = ({
  status,
}) => {
  return <CatalogStatusTag status={status} />;
};
