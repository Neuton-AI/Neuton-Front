import type React from "react";
import {
  CatalogStatusTag,
  type CatalogStatus,
} from "../CatalogStatusTag/CatalogStatusTag";

export const RecipeStatusPill: React.FC<{
  status: CatalogStatus | undefined;
}> = ({ status }) => {
  if (!status) return null;
  return <CatalogStatusTag status={status} />;
};
