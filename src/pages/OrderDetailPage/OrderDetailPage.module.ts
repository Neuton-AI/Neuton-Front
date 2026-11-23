import { useSheetClose } from "@/components/Sheet/Sheet.module";
import {
  useAuth,
  useCurrentShop,
  useShopMemberships,
} from "@/features/auth/auth";
import {
  useDeleteOrder,
  useMarkOrderDelivered,
  useOrder,
  useOrderForEdit,
  useUndoOrderDelivery,
} from "@/features/orders/ordersApi";
import { ApiError } from "@/lib/api";
import { toNumber } from "@/lib/format";
import { useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

export function useOrderDetailPage() {
  const { id = "" } = useParams();

  const location = useLocation();

  const navigate = useNavigate();

  const { user, userId } = useAuth();

  const { memberships, activeShopId } = useShopMemberships(user?.id);
  const role = memberships.find(membership => membership.shopId === activeShopId)?.role;
  const canEdit = role === "owner" || role === "admin";

  const shop = useCurrentShop(memberships, activeShopId);

  const orderQuery = useOrder(userId, activeShopId, id);

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

  const markOrder = useMarkOrderDelivered(userId, activeShopId);
  const undoOrder = useUndoOrderDelivery(userId, activeShopId);
  const [confirmingUndo, setConfirmingUndo] = useState(false);
  const [undoConflict, setUndoConflict] = useState(false);
  const undoRequest = useRef<{ id: string; baseVersion: number; mutationId: string; version: number } | null>(null);
  const undoSnapshot = useOrderForEdit(userId, activeShopId, id, confirmingUndo && canEdit);
  const undoBaseVersion = undoSnapshot.data?.syncVersion;
  const canConfirmUndo = undoSnapshot.data?.order.status === "delivered" &&
    Number.isSafeInteger(undoBaseVersion) && !undoSnapshot.isFetching && !undoConflict && !undoSnapshot.error;
  const undoError = undoOrder.error ?? undoSnapshot.error;
  const undoMessage = undoError?.message ?? (undoSnapshot.data && !undoSnapshot.isFetching && !canConfirmUndo
    ? "This order changed. Close this dialog and reopen it before retrying."
    : null);

  const openUndo = () => {
    undoOrder.reset();
    undoRequest.current = null;
    setUndoConflict(false);
    setConfirmingUndo(true);
  };
  const closeUndo = () => {
    if (!undoOrder.isPending) setConfirmingUndo(false);
  };
  const confirmUndo = async () => {
    if (!canConfirmUndo || undoBaseVersion === undefined || undoOrder.isPending) return;
    const request = undoRequest.current ?? {
      id, baseVersion: undoBaseVersion, mutationId: crypto.randomUUID(),
      version: Math.max(Date.now(), undoBaseVersion + 1),
    };
    undoRequest.current = request;
    try {
      await undoOrder.mutateAsync({ ...request, body: { confirmedMarkedByMistake: true } });
      setConfirmingUndo(false);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
        setUndoConflict(true);
      }
    }
  };

  const deleteOrder = useDeleteOrder(userId, activeShopId);

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
      : "Could not load the order."
    : actionError;

  const retry = () => {
    setActionError(null);
    void orderQuery.refetch();
  };

  const currency = shop?.currency ?? "USD";

  const close = useSheetClose("/orders");

  const justSaved =
    (location.state as { fresh?: boolean } | null)?.fresh === true;

  const remove = async () => {
    if (!userId || !activeShopId || !id || deleteOrder.isPending) return;
    setConfirmingDelete(false);

    setActionError(null);
    try {
      await deleteOrder.mutateAsync({ id });
      navigate("/orders", { replace: true });
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Could not delete the order.",
      );
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
    if (!userId || !activeShopId || !id || markOrder.isPending || !order) return;

    setMarkError(null);
    try {
      await markOrder.mutateAsync({ id });
    } catch (cause) {
      setMarkError(
        cause instanceof Error
          ? cause.message
          : "Could not mark the order delivered.",
      );
    }
  };

  const marginPercent =
    order && toNumber(order.totalAmount) > 0
      ? (order.netProfit / toNumber(order.totalAmount)) * 100
      : 0;

  const markOrderPending = markOrder.isPending;
  const deleteOrderPending = deleteOrder.isPending;
  return {
    userId,
    activeShopId,
    shop,
    order,
    markError,
    confirmingUndo,
    openUndo,
    closeUndo,
    confirmUndo,
    canConfirmUndo,
    undoMessage,
    undoPending: undoOrder.isPending,
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
    canEdit,
    edit: () => navigate(`/orders/${id}/edit`, { state: { fromOrderDetail: true } }),
    marginPercent,
    markOrderPending,
    deleteOrderPending,
  };
}
export type OrderDetailPageModel = ReturnType<typeof useOrderDetailPage>;
