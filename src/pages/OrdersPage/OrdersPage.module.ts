import { useFabNavigation } from '@/components/Fab/Fab.module';
import { useAuth, useCurrentShop, useShopMemberships } from '@/features/auth/supabase';
import { useOrders } from '@/features/orders/ordersApi';
import type { Order, OrderStatus } from '@/features/orders/types';
import { useMemo, useState } from 'react';
function formatOrderHeader(order: Order): string {
  const customer = order.customerName?.trim() || 'Unnamed customer';
  // The invoice number is the shop-facing handle: sequential, per shop,
  // shorter than the UUID and the thing invoices print (N-105).
  return `${customer} · #${order.orderNumber}`;
}

type StatusFilter = 'all' | OrderStatus;
export function useOrdersPage() {
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
    const orders = fetched;
    return [...orders]
      .sort((a, b) => Date.parse(b.orderDate) - Date.parse(a.orderDate))
      .map((order) => ({
        ...order,
        header: formatOrderHeader(order),
        isDeleted: order.status === 'cancelled',
      }));
  }, [data]);

  const handleRetry = () => {
    void refetch();
  };
  return {
    fabNavigation,
    statusFilter,
    setStatusFilter,
    error,
    handleRetry,
    loading,
    message,
    currency,
    visibleOrders,
  };
}
export type OrdersPageModel = ReturnType<typeof useOrdersPage>;
