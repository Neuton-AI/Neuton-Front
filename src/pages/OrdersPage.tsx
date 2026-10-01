import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { Fab, useFabNavigation } from '../components/Fab';
import { EmptyState, ErrorState, Skeleton } from '../components/feedback';
import { PageHeader } from '../components/PageHeader';
import { IconBag, IconPlus, IconSearch } from '../components/icons';
import { apiFetch, type Order } from '../lib/api';
import { formatDate, formatMoney } from '../lib/format';
import { useAuth, useCurrentShop, useShopMemberships } from '../lib/supabase';

type Sort = 'recent' | 'profit' | 'revenue';

/** Orders have no status column, so this view filters and sorts client-side. */
const SORTS: { key: Sort; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'profit', label: 'Profit' },
  { key: 'revenue', label: 'Revenue' },
];

export function OrdersPage() {
  const { user, token } = useAuth();
  const { memberships, activeShopId } = useShopMemberships(user?.id);
  const shop = useCurrentShop(memberships, activeShopId);
  const fabNavigation = useFabNavigation();

  const [sort, setSort] = useState<Sort>('recent');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
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
      setOrders(data.orders);
      setTotal(data.total);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your orders');
    } finally {
      setLoading(false);
    }
  }, [token, activeShopId]);

  useEffect(() => {
    void load();
  }, [load]);

  const currency = shop?.currency ?? 'USD';
  const needle = search.trim().toLowerCase();

  const visible = useMemo(() => {
    const filtered = needle
      ? orders.filter((order) =>
          `${order.customerName ?? ''} ${order.destinationAddress ?? ''}`
            .toLowerCase()
            .includes(needle),
        )
      : orders;

    const sorted = [...filtered];
    if (sort === 'profit') sorted.sort((a, b) => b.netProfit - a.netProfit);
    else if (sort === 'revenue') {
      sorted.sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount));
    } else {
      sorted.sort((a, b) => Date.parse(b.orderDate) - Date.parse(a.orderDate));
    }
    return sorted;
  }, [orders, needle, sort]);

  const netProfit = useMemo(
    () => visible.reduce((sum, order) => sum + order.netProfit, 0),
    [visible],
  );

  return (
    <div className="shell">
      <div className="flex-1 pb-32 pt-[max(var(--safe-top)+44px,44px)]">
        <div className="px-4">
          <PageHeader
            eyebrow={shop?.name}
            title="Orders"
            action={
              <Link
                to="/orders/new"
                aria-label="New order"
                className="pressable flex h-9 w-9 items-center justify-center rounded-pill bg-brand-primary text-ink-on-primary"
              >
                <IconPlus className="h-5 w-5" />
              </Link>
            }
          />
        </div>

        <div className="mt-4 space-y-2.5 px-4">
          <label className="flex items-center gap-2 rounded-card bg-surface-card px-3.5 py-2.5">
            <IconSearch className="h-4 w-4 shrink-0 text-ink-muted" />
            <span className="sr-only">Search orders</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer or address"
              className="w-full bg-transparent text-body text-ink outline-none placeholder:text-ink-muted-soft"
            />
          </label>

          <div role="tablist" aria-label="Sort orders" className="flex gap-1.5">
            {SORTS.map(({ key, label }) => (
              <button
                key={key}
                role="tab"
                aria-selected={sort === key}
                type="button"
                onClick={() => setSort(key)}
                className={`flex-1 rounded-pill px-3 py-2 text-label font-medium transition-colors duration-200 ${
                  sort === key
                    ? 'bg-surface-dark text-ink-on-dark'
                    : 'bg-surface-card text-ink-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2.5 px-4">
          {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

          {loading ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<IconBag className="h-9 w-9" />}
              title={needle ? 'No matching orders' : 'No orders yet'}
              body={
                needle
                  ? 'Try a different customer name or address.'
                  : 'Create an order, pick recipes from your catalog, and Neuton prices it from live ingredient costs.'
              }
              action={
                needle ? null : (
                  <Link
                    to="/orders/new"
                    className="pressable inline-flex items-center gap-1.5 rounded-pill bg-brand-primary px-4 py-2.5 text-label font-medium text-ink-on-primary"
                  >
                    <IconPlus className="h-4 w-4" />
                    New order
                  </Link>
                )
              }
            />
          ) : (
            <>
              {visible.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="pressable flex flex-col gap-2 rounded-card bg-surface-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 flex-1 font-display text-[22px] leading-tight text-ink">
                      {order.customerName ?? 'Unnamed customer'}
                    </h2>
                    <span
                      className={`shrink-0 rounded-pill px-2 py-0.5 text-label font-medium ${
                        order.netProfit >= 0
                          ? 'bg-brand-teal/20 text-ink'
                          : 'bg-semantic-error/15 text-ink'
                      }`}
                    >
                      {formatMoney(order.netProfit, currency)} profit
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 flex-1 truncate text-label text-ink-muted">
                      {formatDate(order.orderDate)}
                      {order.destinationAddress ? ` · ${order.destinationAddress}` : ''}
                    </p>
                    <p className="shrink-0 font-display text-[20px] text-ink">
                      {formatMoney(order.totalAmount, currency)}
                    </p>
                  </div>
                </Link>
              ))}
              <p className="pb-2 text-center text-label text-ink-muted-soft">
                {visible.length} of {total} orders · {formatMoney(netProfit, currency)} net profit
              </p>
            </>
          )}
        </div>
      </div>

      <Fab {...fabNavigation} />
      <BottomNav />
    </div>
  );
}