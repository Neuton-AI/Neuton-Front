import type React from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { DocumentSources } from "@/components/DocumentSources/DocumentSources";
import { Sheet, SheetSection } from "@/components/Sheet/Sheet";
import { ErrorState, InlineNotice, Skeleton } from "@/components/feedback";
import { Button } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import {
  OrderDelivery,
  OrderItems,
  OrderSummary,
} from "./components/OrderSummary/OrderSummary";
import { useOrderDetailPage } from "./OrderDetailPage.module";

export const OrderDetailPage: React.FC = () => {
  const model = useOrderDetailPage();
  const { order, loading, error, currency } = model;
  return (
    <Sheet open onClose={model.close} label="Order details">
      <div className="flex flex-col gap-3 overflow-y-auto px-5 pb-5 pt-2">
        {error ? <ErrorState message={error} onRetry={model.retry} /> : null}
        {loading && !order ? (
          <>
            <Skeleton className="h-[88px]" />
            <Skeleton className="h-[113px]" />
            <Skeleton className="h-40" />
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
              distanceFee={model.distanceFee}
              baseFee={model.baseFee}
              rate={model.shop?.deliveryRatePerKm}
            />
            <SheetSection title="Cost">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-label text-ink-muted">
                  Production cost
                </span>
                <span className="text-body text-ink">
                  {formatMoney(order.totalCost, currency)}
                </span>
              </div>
            </SheetSection>
            {order.sources?.length ? (
              <SheetSection title="Original scans">
                <DocumentSources
                  token={model.token}
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
            {order.status === "processing" ? (
              <div className="flex flex-col gap-2.5">
                <InlineNotice>
                  Still being prepared. Mark it delivered once the customer has
                  it.
                </InlineNotice>
                {model.markError ? (
                  <InlineNotice tone="error">{model.markError}</InlineNotice>
                ) : null}
                <Button
                  size="md"
                  block
                  loading={model.markOrderPending}
                  onClick={model.markDelivered}
                >
                  Mark as delivered
                </Button>
              </div>
            ) : order.status === "cancelled" ? (
              <InlineNotice tone="error">
                This order was deleted. It stays on your records so its number
                is never reused.
              </InlineNotice>
            ) : null}
            {order.status !== "cancelled" ? (
              <Button
                variant="danger"
                size="md"
                block
                loading={model.deleteOrderPending}
                onClick={() => model.setConfirmingDelete(true)}
              >
                Delete order
              </Button>
            ) : null}
          </>
        ) : !error ? (
          <Skeleton className="h-[88px]" />
        ) : null}
      </div>
      <ConfirmDialog
        open={model.confirmingDelete}
        title="Delete this order?"
        description="It stays on your records so its number is never reused."
        confirmLabel="Delete order"
        onConfirm={model.remove}
        onCancel={() => model.setConfirmingDelete(false)}
      />
    </Sheet>
  );
};
