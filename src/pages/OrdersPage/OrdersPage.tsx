import { BottomNav } from '@/components/BottomNav/BottomNav';
import { Fab } from '@/components/Fab/Fab';
import { ErrorState } from '@/components/feedback';
import { Layout } from '@/components/Layout/Layout';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { Link } from 'react-router-dom';
import { OrderFilters } from './OrderFilters/OrderFilters';
import { OrderRow } from './OrderRow/OrderRow';
import { OrdersEmpty } from './OrdersEmpty/OrdersEmpty';
import { useOrdersPage } from './OrdersPage.module';
import { OrdersSkeleton } from './OrdersSkeleton/OrdersSkeleton';

export function OrdersPage() {
  const model = useOrdersPage();
  return (
    <Layout
      className="shell"
      mainContent={
        <div className="flex-1 pb-44">
          <PageHeader eyebrow="YOUR SALES" title="Orders" className="screen-header px-4" />
          <OrderFilters statusFilter={model.statusFilter} onSelect={model.setStatusFilter} />
          <div className="mt-4 px-4">
            {model.error ? <ErrorState message={model.message} onRetry={model.handleRetry} /> : null}
            {model.loading ? (
              <OrdersSkeleton />
            ) : model.visibleOrders.length === 0 ? (
              <OrdersEmpty />
            ) : (
              <div className="flex flex-col gap-3">
                {model.visibleOrders.map((order) => (
                  <OrderRow key={order.id} order={order} currency={model.currency} />
                ))}
              </div>
            )}
          </div>
        </div>
      }
      actions={
        <Fab
          {...model.fabNavigation}
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
