import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { Fab, useFabNavigation } from '../components/Fab';
import { ErrorState } from '../components/feedback';
import { PageHeader } from '../components/PageHeader';
import { IconBag } from '../components/icons';
import type { Order, OrderStatus } from '../lib/api';
import { formatDate, formatMoney } from '../lib/format';
import { getOrderStatusLabel } from '../lib/orderStatus';
import { useOrders } from '../lib/queries';
import { useAuth, useCurrentShop, useShopMemberships } from '../lib/supabase';

function formatOrderHeader(order: Order): string {
  const customer = order.customerName?.trim() || 'Unnamed customer';
  if (!order.id) return customer;
  const cleanId = order.id.replace(/-/g, '').slice(0, 4);
  return `${customer} · #${cleanId}`;
}

/** Sample stub order matching Brilliant mockup for visual confirmation. */
export const STUB_ORDER: Order = {
  id: '1048',
  shopId: 'stub',
  userId: null,
  customerName: 'Maya C.',
  orderDate: '2026-09-28T10:00:00.000Z',
  destinationAddress: '123 Market St',
  deliveryDistanceKm: '0.00',
  deliveryFee: '0.00',
  appliedProfitMargin: null,
  totalCost: '40.00',
  totalAmount: '62.12',
  documentUrl: null,
  status: 'processing',
  netProfit: 22.12,
  createdAt: '2026-09-28T10:00:00.000Z',
};

type StatusFilter = 'all' | OrderStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'processing', label: 'Processing' },
  { key: 'delivered', label: 'Delivered' },
];

/** Compact status pill for the order row, next to the date line. */
function OrderStatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-pill px-2 py-0.5 text-[11px] font-medium leading-tight ${
        status === 'delivered' ? 'bg-brand-teal/25 text-ink' : 'bg-brand-amber/20 text-ink'
      }`}
    >
      {getOrderStatusLabel(status)}
    </span>
  );
}

type OrdersPageProps = {
  includeStub?: boolean;
};

export function OrdersPage({ includeStub = true }: OrdersPageProps = {}) {
  const { user, token } = useAuth();
  const { memberships, activeShopId } = useShopMemberships(user?.id);
  const shop = useCurrentShop(memberships, activeShopId);
  const fabNavigation = useFabNavigation();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data, isLoading, error, refetch } = useOrders(token, activeShopId, statusFilter);
  const loading = isLoading;
  const message = error instanceof Error ? error.message : 'Could not load your orders';

  const currency = shop?.currency ?? 'USD';

  const visibleOrders = useMemo(() => {
    const fetched = data?.orders ?? [];
    const orders = fetched.length > 0 ? fetched : includeStub ? [STUB_ORDER] : [];
    return [...orders].sort((a, b) => Date.parse(b.orderDate) - Date.parse(a.orderDate));
  }, [data, includeStub]);

  return (
    <div className="shell">
      <div className="flex-1 pb-44 pt-[max(var(--safe-top)+44px,44px)]">
        <div className="px-4">
          <PageHeader eyebrow="YOUR SALES" title="Orders" />
        </div>

        <div
          role="tablist"
          aria-label="Order status filter"
          className="no-scrollbar mt-4 flex gap-1.5 overflow-x-auto px-4"
        >
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={statusFilter === key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`pressable flex shrink-0 items-center gap-1.5 rounded-pill px-3.5 py-2 text-label font-medium transition-colors duration-200 ${
                statusFilter === key
                  ? 'bg-surface-dark text-ink-on-dark'
                  : 'bg-surface-card text-ink-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 px-4">
          {error ? <ErrorState message={message} onRetry={() => void refetch()} /> : null}

          {loading ? (
            <div className="flex flex-col gap-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex h-[74px] items-center gap-3 rounded-card border border-hairline bg-surface-canvas p-3"
                  aria-hidden="true"
                >
                  <div className="h-11 w-11 shrink-0 rounded-[8px] bg-surface-card animate-pulse" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="h-4 w-[150px] max-w-[60%] rounded-[6px] bg-surface-card animate-pulse" />
                    <div className="h-3 w-[90px] max-w-[40%] rounded-[6px] bg-surface-card animate-pulse" />
                  </div>
                  <div className="h-[18px] w-14 shrink-0 rounded-[6px] bg-surface-card animate-pulse" />
                </div>
              ))}
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex h-[136px] w-[136px] items-center justify-center rounded-full bg-surface-card">
                <div className="flex h-[92px] w-[92px] items-center justify-center rounded-full bg-surface-canvas text-ink-muted shadow-sm">
                  <IconBag className="h-10 w-10" />
                </div>
              </div>
              <div className="h-2" />
              <h2 className="font-display text-[28px] leading-tight text-ink">No orders yet</h2>
              <p className="max-w-[270px] text-[14px] leading-normal text-ink-muted">
                Log your first sale to start tracking revenue, delivery fees and profit per order.
              </p>
              <p className="text-[13px] font-medium leading-normal text-ink-muted">
                Tap Add New Order below
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {visibleOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="pressable flex items-center gap-3 rounded-card border border-hairline bg-surface-canvas p-3.5 transition-colors hover:border-brand-primary/30"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-surface-card text-ink-muted">
                    <IconBag className="h-5 w-5" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <h2 className="truncate text-[16px] font-medium leading-snug text-ink">
                      {formatOrderHeader(order)}
                    </h2>
                    <p className="flex items-center gap-1.5 truncate text-[13px] leading-snug text-ink-muted">
                      <span className="truncate">{formatDate(order.orderDate)}</span>
                      <OrderStatusPill status={order.status} />
                    </p>
                  </div>
                  <span className="shrink-0 text-[18px] font-medium leading-snug text-ink">
                    {formatMoney(order.totalAmount, currency)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Fab
        {...fabNavigation}
        action={
          <Link
            to="/orders/new"
            className="pressable flex h-14 w-full items-center justify-center rounded-pill bg-brand-primary text-[14px] font-medium text-ink-on-primary shadow-[0_8px_24px_rgba(204,120,92,0.32)] transition-colors"
          >
            Add New Order
          </Link>
        }
      />
      <BottomNav />
    </div>
  );
}