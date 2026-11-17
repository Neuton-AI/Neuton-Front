import type React from "react";
import { BottomNav } from "@/components/BottomNav/BottomNav";
import { ErrorState } from "@/components/feedback";
import { Layout } from "@/components/Layout/Layout";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { NewOrderAction } from "./components/NewOrderAction/NewOrderAction";
import { OrderFilters } from "./components/OrderFilters/OrderFilters";
import { OrderRow } from "./components/OrderRow/OrderRow";
import { OrdersEmpty } from "./components/OrdersEmpty/OrdersEmpty";
import { useOrdersPage } from "./OrdersPage.module";
import { OrdersSkeleton } from "./components/OrdersSkeleton/OrdersSkeleton";

export const OrdersPage: React.FC = () => {
  const model = useOrdersPage();
  return (
    <Layout
      className="shell"
      mainContent={
        <div className="flex-1 pb-[calc(var(--bottom-nav-height)+32px)]">
          <PageHeader
            eyebrow="YOUR SALES"
            title="Orders"
            action={<NewOrderAction />}
            className="screen-header px-4"
          />
          <OrderFilters
            statusFilter={model.statusFilter}
            onSelect={model.setStatusFilter}
          />
          <div className="mt-3 px-4">
            {model.error ? (
              <ErrorState message={model.message} onRetry={model.handleRetry} />
            ) : null}
            {model.loading ? (
              <OrdersSkeleton />
            ) : model.visibleOrders.length === 0 ? (
              <OrdersEmpty />
            ) : (
              <div className="flex flex-col gap-3">
                {model.visibleOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    currency={model.currency}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      }
      footer={<BottomNav />}
    />
  );
};
