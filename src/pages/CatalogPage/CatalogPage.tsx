import type React from "react";
import { BottomNav } from "@/components/BottomNav/BottomNav";
import { Layout } from "@/components/Layout/Layout";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { CatalogBody } from "./components/CatalogBody/CatalogBody";
import { CatalogEmpty } from "./components/CatalogEmpty/CatalogEmpty";
import { useCatalogPage } from "./CatalogPage.module";
import { CatalogTabs } from "./components/CatalogTabs/CatalogTabs";

export const CatalogPage: React.FC = () => {
  const model = useCatalogPage();
  const { tab } = model;
  const isEmpty =
    !model.errors[tab] && model.loadingTab !== tab && model[tab].length === 0;

  return (
    <Layout
      className="shell"
      mainContent={
        <div
          className={
            isEmpty
              ? "flex flex-1 flex-col pb-[calc(var(--bottom-nav-height)+32px)]"
              : "flex-1 pb-32"
          }
        >
          <PageHeader
            eyebrow={model.shop?.name}
            title="Catalog"
            className="screen-header px-4"
          />
          <CatalogTabs
            tab={tab}
            onSelect={model.handleSelectTab}
            className={isEmpty ? "mt-1" : undefined}
          />
          {isEmpty ? <CatalogEmpty tab={tab} /> : <CatalogBody model={model} />}
        </div>
      }
      footer={<BottomNav captureKind={model.captureKind} />}
    />
  );
};
