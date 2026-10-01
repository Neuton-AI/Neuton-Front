import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Sheet, SheetSection, useSheetClose } from '../components/Sheet';
import { Button } from '../components/ui';
import { ErrorState, Skeleton } from '../components/feedback';
import { IconPin } from '../components/icons';
import { apiFetch, type OrderDetail } from '../lib/api';
import { formatDate, formatMoney, formatQuantity, toNumber } from '../lib/format';
import { useAuth, useCurrentShop, useShopMemberships } from '../lib/supabase';

/** Renders the OpenPencil "Modal / Order Detail" sheet from GET /orders/:id. */
export function OrderDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { memberships, activeShopId } = useShopMemberships(user?.id);
  const shop = useCurrentShop(memberships, activeShopId);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const currency = shop?.currency ?? 'USD';
  const close = useSheetClose('/orders');
  const loadKey = `${token ?? ''}:${activeShopId ?? ''}:${reloadKey}`;
  const justSaved = (location.state as { fresh?: boolean } | null)?.fresh === true;

  useEffect(() => {
    if (!token || !activeShopId || !id) return;
    const controller = new AbortController();

    setLoading(true);
    setError(null);
    apiFetch<{ order: OrderDetail }>(`/orders/${id}`, {
      token,
      shopId: activeShopId,
      signal: controller.signal,
    })
      .then((data) => setOrder(data.order))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Could not load the order.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [loadKey, id]);

  const remove = async () => {
    if (!token || !activeShopId || !id || deleting) return;
    if (!window.confirm('Delete this order? This cannot be undone.')) return;

    setDeleting(true);
    setError(null);
    try {
      await apiFetch<undefined>(`/orders/${id}`, { method: 'DELETE', token, shopId: activeShopId });
      navigate('/orders', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the order.');
      setDeleting(false);
    }
  };

  const marginPercent =
    order && toNumber(order.totalAmount) > 0
      ? (order.netProfit / toNumber(order.totalAmount)) * 100
      : 0;
  const baseFee = toNumber(shop?.deliveryBaseFee);

  return (
    <Sheet open onClose={close} label="Order details">
      <div className="flex flex-col gap-3 overflow-y-auto px-5 pb-5 pt-2">
        {error ? <ErrorState message={error} onRetry={() => setReloadKey((n) => n + 1)} /> : null}

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
                {formatDate(order.orderDate)} · #{order.id.slice(0, 8)}
              </p>
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
                    {formatMoney(toNumber(item.quantity) * toNumber(item.unitPrice), currency)}
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
                  {formatMoney(toNumber(order.deliveryDistanceKm) * toNumber(shop?.deliveryRatePerKm), currency)}
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

            <Button variant="danger" size="md" block loading={deleting} onClick={remove}>
              Delete order
            </Button>
          </>
        ) : !error ? (
          <Skeleton className="h-[88px]" />
        ) : null}
      </div>
    </Sheet>
  );
}