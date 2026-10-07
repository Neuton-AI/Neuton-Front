import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { Fab, useFabNavigation } from '../components/Fab';
import { ErrorState } from '../components/feedback';
import { PageHeader } from '../components/PageHeader';
import { IconBag } from '../components/icons';
import { apiFetch, type Order } from '../lib/api';
import { formatDate, formatMoney } from '../lib/format';
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
  netProfit: 22.12,
  createdAt: '2026-09-28T10:00:00.000Z',
};

type OrdersPageProps = {
  includeStub?: boolean;
};

export function OrdersPage({ includeStub = true }: OrdersPageProps = {}) {
  const { user, token } = useAuth();
  const { memberships, activeShopId } = useShopMemberships(user?.id);
  const shop = useCurrentShop(memberships, activeShopId);
  const fabNavigation = useFabNavigation();

  const [orders, setOrders] = useState<Order[]>(includeStub ? [STUB_ORDER] : []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !activeShopId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ orders: Order[]; total: number }>('/orders?limit=100', {
        token,
        shopId: activeShopId,
      });
      const fetched = data.orders ?? [];
      setOrders(fetched.length > 0 ? fetched : includeStub ? [STUB_ORDER] : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your orders');
    } finally {
      setLoading(false);
    }
  }, [token, activeShopId, includeStub]);

  useEffect(() => {
    void load();
  }, [load]);

  const currency = shop?.currency ?? 'USD';

  const visibleOrders = useMemo(() => {
    return [...orders].sort((a, b) => Date.parse(b.orderDate) - Date.parse(a.orderDate));
  }, [orders]);

  return (
    <div className="shell">
      <div className="flex-1 pb-44 pt-[max(var(--safe-top)+44px,44px)]">
        <div className="px-4">
          <PageHeader eyebrow="YOUR SALES" title="Orders" />
        </div>

        <div className="mt-4 px-4">
          {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

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
                    <p className="truncate text-[13px] leading-snug text-ink-muted">
                      {formatDate(order.orderDate)}
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