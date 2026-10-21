import { BottomNav } from '@/components/BottomNav/BottomNav';
import { Fab } from '@/components/Fab/Fab';
import { Layout } from '@/components/Layout/Layout';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { ErrorState } from '@/components/feedback';
import { IconBag } from '@/components/icons';
import type { OrderStatus } from '@/features/orders/types';
import { formatDate, formatMoney } from '@/lib/format';
import { Link } from 'react-router-dom';
import { OrderStatusPill } from './OrderStatusPill/OrderStatusPill';
import { useOrdersPage } from './OrdersPage.module';
type StatusFilter = 'all' | OrderStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'processing', label: 'Processing' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Deleted' },
];
export function OrdersPage() {
  const {
    fabNavigation,
    statusFilter,
    setStatusFilter,
    error,
    refetch,
    loading,
    message,
    currency,
    visibleOrders,
  } = useOrdersPage();
  return (
    <Layout
      className="shell"
      mainContent={
        <div className="flex-1 pb-44">
          <PageHeader eyebrow="YOUR SALES" title="Orders" className="screen-header px-4" />

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
                {visibleOrders.map((order) => {
                  // A deleted order keeps its place in the list but reads as inert:
                  // grey surface, dimmed, and struck through.
                  const { isDeleted } = order;
                  return (
                    <Link
                      key={order.id}
                      to={`/orders/${order.id}`}
                      className={`pressable flex items-center gap-3 rounded-card border p-3.5 transition-colors ${
                        isDeleted
                          ? 'border-deleted-border bg-deleted-surface opacity-[0.72]'
                          : 'border-hairline bg-surface-canvas hover:border-brand-primary/30'
                      }`}
                    >
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-ink-muted ${
                          isDeleted ? 'bg-deleted-badge opacity-70' : 'bg-surface-card'
                        }`}
                      >
                        <IconBag className="h-5 w-5" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <h2
                          className={`truncate text-[16px] font-medium leading-snug ${
                            isDeleted ? 'text-ink-muted line-through' : 'text-ink'
                          }`}
                        >
                          {order.header}
                        </h2>
                        <p
                          className={`flex items-center gap-1.5 truncate text-[13px] leading-snug ${
                            isDeleted ? 'text-ink-muted-soft' : 'text-ink-muted'
                          }`}
                        >
                          <span className={`truncate ${isDeleted ? 'line-through' : ''}`}>
                            {formatDate(order.orderDate)}
                          </span>
                          <OrderStatusPill status={order.status} />
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-[18px] font-medium leading-snug ${
                          isDeleted ? 'text-ink-muted-soft line-through' : 'text-ink'
                        }`}
                      >
                        {formatMoney(order.totalAmount, currency)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      }
      actions={
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
      }
      footer={<BottomNav />}
    />
  );
}
