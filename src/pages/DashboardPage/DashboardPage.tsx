import type React from "react";
import { BottomNav } from "@/components/BottomNav/BottomNav";
import { Fab } from "@/components/Fab/Fab";
import { ErrorState, FullPageLoader } from "@/components/feedback";
import { Layout } from "@/components/Layout/Layout";
import { InstallAppPopover } from "@/features/pwa/InstallApp";
import { DashboardEmpty } from "./components/DashboardEmpty/DashboardEmpty";
import { DashboardHeader } from "./components/DashboardHeader/DashboardHeader";
import { DashboardMetrics } from "./components/DashboardMetrics/DashboardMetrics";
import { useDashboardPage } from "./DashboardPage.module";
import { ProfitPanel } from "./components/ProfitPanel/ProfitPanel";

export const DashboardPage: React.FC = () => {
  const model = useDashboardPage();
  if (model.authLoading || model.shopsLoading)
    return <FullPageLoader label="Opening shop" />;
  if (model.shopsError) return <ErrorState message={model.shopsError} />;
  if (!model.activeShopId)
    return <DashboardEmpty onSetUp={model.handleSetUpShop} />;
  return (
    <Layout
      className="shell bg-[#FAF9F5]"
      mainContent={
        <div className="flex-1 space-y-3 px-4 pb-32">
          <DashboardHeader {...model} />
          <InstallAppPopover />
          {model.error ? (
            <ErrorState
              message={model.errorMessage}
              onRetry={model.handleRetry}
            />
          ) : null}
          <ProfitPanel {...model} />
          <DashboardMetrics {...model} />
        </div>
      }
      actions={<Fab {...model.fabNavigation} />}
      footer={<BottomNav />}
    />
  );
};
