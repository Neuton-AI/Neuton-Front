import { useSheetClose } from '@/components/Sheet/Sheet.module';
import { useAuth, useCurrentShop, useShopMemberships } from '@/features/auth/supabase';
import { useDeleteOrder, useMarkOrderDelivered, useOrder } from '@/features/orders/ordersApi';
import { toNumber } from '@/lib/format';
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

export function useOrderDetailPage() {
  const { id = '' } = useParams();

  const location = useLocation();

  const navigate = useNavigate();

  const { user, token } = useAuth();

  const { memberships, activeShopId } = useShopMemberships(user?.id);

  const shop = useCurrentShop(memberships, activeShopId);

  const orderQuery = useOrder(token, activeShopId, id);

  const sourceOrder = orderQuery.data?.order;
  const order = sourceOrder
    ? {
        ...sourceOrder,
        items: sourceOrder.items.map((item) => ({
          ...item,
          lineTotal: toNumber(item.quantity) * toNumber(item.unitPrice),
        })),
      }
    : null;

  const markOrder = useMarkOrderDelivered(token, activeShopId);

  const deleteOrder = useDeleteOrder(token, activeShopId);

  /** A failed delete belongs in the load-error slot whose retry refetches. */
  const [actionError, setActionError] = useState<string | null>(null);

  /** Kept apart from the load error: a failed transition belongs next to its
   *  button, not in the slot whose retry only refetches the order. */
  const [markError, setMarkError] = useState<string | null>(null);

  /** The delete confirmation is an in-app dialog, not a native confirm. */
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const loading = orderQuery.isLoading && !order;

  const error = orderQuery.error
    ? orderQuery.error instanceof Error
      ? orderQuery.error.message
      : 'Could not load the order.'
    : actionError;

  const retry = () => {
    setActionError(null);
    void orderQuery.refetch();
  };

  const currency = shop?.currency ?? 'USD';

  const close = useSheetClose('/orders');

  const justSaved = (location.state as { fresh?: boolean } | null)?.fresh === true;

  const remove = async () => {
    if (!token || !activeShopId || !id || deleteOrder.isPending) return;
    setConfirmingDelete(false);

    setActionError(null);
    try {
      await deleteOrder.mutateAsync({ id });
      navigate('/orders', { replace: true });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not delete the order.');
    }
  };

  /**
   * Human verification gate: `processing` → `delivered`. Any shop member may
   * do this — the server enforces membership, not role — so there is no role
   * gate here. The transition response carries the order row without its
   * items, so only the status is taken from it; the refetch brings back the
   * full detail. The sheet flips immediately so the button cannot be pressed
   * twice while the refetch is still in flight.
   */
  const markDelivered = async () => {
    if (!token || !activeShopId || !id || markOrder.isPending || !order) return;

    setMarkError(null);
    try {
      await markOrder.mutateAsync({ id });
    } catch (cause) {
      setMarkError(cause instanceof Error ? cause.message : 'Could not mark the order delivered.');
    }
  };

  const marginPercent =
    order && toNumber(order.totalAmount) > 0
      ? (order.netProfit / toNumber(order.totalAmount)) * 100
      : 0;

  const baseFee = toNumber(shop?.deliveryBaseFee);
  const markOrderPending = markOrder.isPending;
  const deleteOrderPending = deleteOrder.isPending;
  const distanceFee = toNumber(order?.deliveryDistanceKm) * toNumber(shop?.deliveryRatePerKm);
  return {
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
  };
}
export type OrderDetailPageModel = ReturnType<typeof useOrderDetailPage>;
