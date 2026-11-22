import type React from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { DocumentSources } from "@/components/DocumentSources/DocumentSources";
import { Sheet, SheetSection } from "@/components/Sheet/Sheet";
import { ErrorState, InlineNotice, Skeleton } from "@/components/feedback";
import { formatMoney } from "@/lib/format";
import {
  OrderDelivery,
  OrderItems,
  OrderSummary,
} from "./components/OrderSummary/OrderSummary";
import { OrderActions } from "./components/OrderActions/OrderActions";
import { useOrderDetailPage } from "./OrderDetailPage.module";

export const OrderDetailPage: React.FC = () => {
  const model = useOrderDetailPage();
  const { order, loading, error, currency } = model;
  return (
    <Sheet open fillHeight onClose={model.close} label="Order details">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-3">
        {error ? <ErrorState message={error} onRetry={model.retry} /> : null}
        {loading && !order ? (
          <>
            <Skeleton className="shrink-0 h-[88px]" />
            <Skeleton className="shrink-0 h-[113px]" />
            <Skeleton className="shrink-0 h-40" />
          </>
        ) : order ? (
          <>
            {model.justSaved ? (
              <p className="rounded-card bg-brand-teal px-3 py-2 text-label font-medium text-ink">
                Order saved
              </p>
            ) : null}
            <OrderSummary
              order={order}
              currency={currency}
              marginPercent={model.marginPercent}
            />
            <OrderItems order={order} currency={currency} />
            <OrderDelivery
              order={order}
              currency={currency}
            />
            <SheetSection title="Cost">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-label text-ink-muted">
                  {order.items.some(item => item.costComplete === false) ? 'Known production cost' : 'Production cost'}
                </span>
                <span className="text-body text-ink">
                  {formatMoney(order.totalCost, currency)}
                </span>
              </div>
            </SheetSection>
            {order.sources?.length ? (
              <SheetSection title="Original scans">
                <DocumentSources
                  userId={model.userId}
                  shopId={model.activeShopId}
                  sources={order.sources}
                />
              </SheetSection>
            ) : null}
            {order.documentUrl ? (
              <a
                href={order.documentUrl}
                target="_blank"
                rel="noreferrer"
                className="pressable text-label font-medium text-ink underline"
              >
                View attached document
              </a>
            ) : null}
            {order.status === "cancelled" ? (
              <InlineNotice tone="error">
                This order was deleted. It stays on your records so its number
                is never reused.
              </InlineNotice>
            ) : null}
          </>
        ) : !error ? (
          <Skeleton className="shrink-0 h-[88px]" />
        ) : null}
      </div>
      <OrderActions model={model} />
      <ConfirmDialog
        open={model.confirmingDelete}
        title="Cancel this order?"
        description="It stays on your records so its number is never reused."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        onConfirm={model.remove}
        onCancel={() => model.setConfirmingDelete(false)}
      />
    </Sheet>
  );
};
