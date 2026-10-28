import type React from "react";
import { ErrorState } from "@/components/feedback";
import type { CatalogPageModel } from "../../CatalogPage.module";
import { CatalogInventory } from "../CatalogInventory/CatalogInventory";
import { CatalogLoading } from "../CatalogLoading/CatalogLoading";
import { CatalogReceipts } from "../CatalogReceipts/CatalogReceipts";
import { CatalogRecipes } from "../CatalogRecipes/CatalogRecipes";

interface ICatalogBody {
  model: CatalogPageModel;
}

export const CatalogBody: React.FC<ICatalogBody> = ({ model }) => {
  const { tab, errors, loadingTab, showInventoryGrid } = model;
  return (
    <div
      className={
        showInventoryGrid
          ? "mt-4 grid grid-cols-2 gap-x-5 gap-y-3 px-4"
          : "mt-4 space-y-2.5 px-4"
      }
    >
      {errors[tab] ? (
        <ErrorState
          message={errors[tab] as string}
          onRetry={() => model.refetchTab(tab)}
        />
      ) : null}
      {loadingTab === tab ? (
        <CatalogLoading tab={tab} />
      ) : tab === "recipes" ? (
        <CatalogRecipes model={model} />
      ) : tab === "inventory" ? (
        <CatalogInventory model={model} />
      ) : (
        <CatalogReceipts model={model} />
      )}
    </div>
  );
};
