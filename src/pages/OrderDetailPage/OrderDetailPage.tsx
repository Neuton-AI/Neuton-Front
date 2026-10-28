import { ConfirmDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import { DocumentSources } from '@/components/DocumentSources/DocumentSources';
import { Sheet, SheetBadge, SheetSection } from '@/components/Sheet/Sheet';
import { ErrorState, InlineNotice, Skeleton } from '@/components/feedback';
import { IconPin } from '@/components/icons';
import { Button } from '@/components/ui';
import { getOrderStatusLabel, getOrderStatusTone } from '@/features/orders/orderStatus';
import { formatDate, formatMoney, formatQuantity } from '@/lib/format';
import { useOrderDetailPage } from './OrderDetailPage.module';

export function OrderDetailPage() {
  const {
    token,
    activeShopId,
    distanceFee,
    shop,
    order,
    markError,
    confirmingDelete,
    setConfirmingDelete,
    loading,
    error,
    retry,
    currency,
    close,
    justSaved,
    remove,
    markDelivered,
    marginPercent,
    baseFee,
    markOrderPending,
    deleteOrderPending,
  } = useOrderDetailPage();
  return (
    <Sheet open onClose={close} label="Order details">
      <div className="flex flex-col gap-3 overflow-y-auto px-5 pb-5 pt-2">
        {error ? <ErrorState message={error} onRetry={retry} /> : null}

        {loading && !order ? (
          <>
            <Skeleton className="h-[88px]" />
            <Skeleton className="h-[113px]" />
            <Skeleton className="h-40" />
          </>
        ) : order ? (
          <>
            {justSaved ? (
              <p className="rounded-card bg-brand-teal px-3 py-2 text-label font-medium text-ink">
                Order saved
              </p>
            ) : null}

            <div className="flex flex-col gap-1">
              <p className="text-eyebrow font-medium uppercase text-ink-muted">Order</p>
              <h1 className="font-display text-card-value text-ink">
                {order.customerName ?? 'Unnamed customer'}
              </h1>
              <p className="text-label font-medium text-ink-muted">
                {formatDate(order.orderDate)} · #{order.orderNumber}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <SheetBadge tone={getOrderStatusTone(order.status)}>
                  {getOrderStatusLabel(order.status)}
                </SheetBadge>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5 rounded-card bg-brand-primary p-4">
                <p className="text-eyebrow font-medium uppercase text-ink-on-primary">Total</p>
                <p className="font-display text-card-value text-ink-on-primary">
                  {formatMoney(order.totalAmount, currency)}
                </p>
                <p className="text-label font-medium text-ink-on-primary">
                  Incl. {formatMoney(order.deliveryFee, currency)} delivery
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 rounded-card bg-surface-dark p-4">
                <p className="text-eyebrow font-medium uppercase text-ink-on-dark-soft">
                  Profit margin
                </p>
                <p className="font-display text-card-value text-ink-on-dark">
                  {marginPercent.toFixed(0)}%
                </p>
                <p className="text-label font-medium text-ink-on-dark-soft">
                  Profit {formatMoney(order.netProfit, currency)}
                </p>
              </div>
            </div>

            <SheetSection title="Items ordered">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 border-b border-hairline-soft py-1.5 last:border-b-0"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-body text-ink">{item.name}</span>
                    <span className="text-label font-medium text-ink-muted">
                      {formatQuantity(item.quantity)} × {formatMoney(item.unitPrice, currency)}
                    </span>
                  </div>
                  <span className="shrink-0 text-body text-ink">
                    {formatMoney(item.lineTotal, currency)}
                  </span>
                </div>
              ))}
            </SheetSection>

            <SheetSection title="Delivery">
              {order.destinationAddress ? (
                <div className="flex items-start gap-2 py-1">
                  <IconPin className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink-muted" />
                  <span className="text-body text-ink">{order.destinationAddress}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3 border-b border-hairline-soft py-1.5">
                <div className="flex min-w-0 flex-col">
                  <span className="text-body text-ink">Distance fee</span>
                  <span className="text-label font-medium text-ink-muted">
                    {Number(order.deliveryDistanceKm).toFixed(1)} km ×{' '}
                    {formatMoney(shop?.deliveryRatePerKm, currency)} / km
                  </span>
                </div>
                <span className="shrink-0 text-body text-ink">
                  {formatMoney(distanceFee, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-hairline-soft py-1.5">
                <span className="text-body text-ink-body">Base fee</span>
                <span className="text-body text-ink">{formatMoney(baseFee, currency)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-[16px] font-medium text-ink">Delivery fee</span>
                <span className="text-[16px] font-medium text-ink">
                  {formatMoney(order.deliveryFee, currency)}
                </span>
              </div>
            </SheetSection>

            <SheetSection title="Cost">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-label text-ink-muted">Production cost</span>
                <span className="text-body text-ink">{formatMoney(order.totalCost, currency)}</span>
              </div>
            </SheetSection>

            {order.sources?.length ? (
              <SheetSection title="Original scans">
                <DocumentSources token={token} shopId={activeShopId} sources={order.sources} />
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

            {order.status === 'processing' ? (
              <div className="flex flex-col gap-2.5">
                <InlineNotice>
                  Still being prepared. Mark it delivered once the customer has it.
                </InlineNotice>
                {markError ? <InlineNotice tone="error">{markError}</InlineNotice> : null}
                <Button size="md" block loading={markOrderPending} onClick={markDelivered}>
                  Mark as delivered
                </Button>
              </div>
            ) : order.status === 'cancelled' ? (
              <InlineNotice tone="error">
                This order was deleted. It stays on your records so its number is never reused.
              </InlineNotice>
            ) : null}

            {order.status !== 'cancelled' ? (
              <Button
                variant="danger"
                size="md"
                block
                loading={deleteOrderPending}
                onClick={() => setConfirmingDelete(true)}
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
        open={confirmingDelete}
        title="Delete this order?"
        description="It stays on your records so its number is never reused."
        confirmLabel="Delete order"
        onConfirm={remove}
        onCancel={() => setConfirmingDelete(false)}
      />
    </Sheet>
  );
}
