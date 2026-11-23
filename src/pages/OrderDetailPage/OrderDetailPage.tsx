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
import { OrderPayments } from "./components/OrderPayments/OrderPayments";
import { CancelOrderDialog } from "./components/CancelOrderDialog/CancelOrderDialog";
import { OrderCancellation } from "./components/OrderCancellation/OrderCancellation";
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
            <OrderPayments key={order.id} order={order} currency={currency} canEdit={model.canEdit}
              userId={model.userId} shopId={model.activeShopId} />
            {order.status === "cancelled" && <OrderCancellation order={order} />}
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
          </>
        ) : !error ? (
          <Skeleton className="shrink-0 h-[88px]" />
        ) : null}
      </div>
      <OrderActions model={model} />
      <ConfirmDialog
        open={model.confirmingUndo}
        variant="standard"
        title="Undo delivery?"
        description={<>
          <strong className="block text-ink">Only undo delivery if the order was marked Delivered by mistake.</strong>
          <span className="mt-2 block">The order will return to Processing. Payments stay as recorded.</span>
        </>}
        confirmLabel={model.undoPending ? "Undoing…" : "Undo delivery"}
        cancelLabel="Keep delivered"
        pending={model.undoPending}
        confirmDisabled={!model.canConfirmUndo}
        feedback={model.undoMessage && <InlineNotice tone="error">{model.undoMessage}</InlineNotice>}
        onConfirm={model.confirmUndo}
        onCancel={model.closeUndo}
      />
      {model.cancellation.dialog && <CancelOrderDialog key={model.cancellation.dialog.review}
        currency={currency} {...model.cancellation.dialog} />}
    </Sheet>
  );
};
