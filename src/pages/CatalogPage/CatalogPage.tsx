import type React from "react";
import { BottomNav } from "@/components/BottomNav/BottomNav";
import { Fab } from "@/components/Fab/Fab";
import { Layout } from "@/components/Layout/Layout";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { CatalogBody } from "./components/CatalogBody/CatalogBody";
import { useCatalogPage } from "./CatalogPage.module";
import { CatalogTabs } from "./components/CatalogTabs/CatalogTabs";

export const CatalogPage: React.FC = () => {
  const model = useCatalogPage();
  return (
    <Layout
      className="shell"
      mainContent={
        <div className="flex-1 pb-32">
          <PageHeader
            eyebrow={model.shop?.name}
            title="Catalog"
            className="screen-header px-4"
          />
          <CatalogTabs tab={model.tab} onSelect={model.handleSelectTab} />
          <CatalogBody model={model} />
        </div>
      }
      actions={<Fab {...model.fabNavigation} />}
      footer={<BottomNav />}
    />
  );
};
