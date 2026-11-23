import { useCacheOrderSnapshot, useCancelOrder, useOrderForEdit } from '@/features/orders/ordersApi';
import type { CancelOrderBody, OrderDetail } from '@/features/orders/types';
import { ApiError } from '@/lib/api';
import type { ShopId, UserId } from '@/lib/queryTypes';
import { useRef, useState } from 'react';

type Request = { id: string; body: CancelOrderBody; mutationId: string; baseVersion: number; version: number };

export const useOrderCancellation = (userId: UserId, shopId: ShopId, id: string,
  order: OrderDetail | undefined, permitted: boolean, onDeleted: () => void) => {
  const [open, setOpen] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [review, setReview] = useState(0);
  const inFlight = useRef(false);
  const request = useRef<Request | null>(null);
  const mutation = useCancelOrder(userId, shopId);
  const snapshot = useOrderForEdit(userId, shopId, id, open && permitted);
  const cache = useCacheOrderSnapshot(userId, shopId);
  const auditedOrder = snapshot.data?.order;
  const eligible = auditedOrder?.status === 'processing' && !!auditedOrder.paymentSummary;

  const start = () => {
    if (!permitted) return;
    request.current = null;
    mutation.reset();
    setConflict(false);
    setOpen(true);
  };
  const close = () => { if (!inFlight.current) setOpen(false); };
  const reload = async () => {
    const result = await snapshot.refetch();
    if (!result.isSuccess) return;
    await cache(result.data);
    request.current = null;
    mutation.reset();
    setConflict(false);
    setReview(previous => previous + 1);
  };
  const confirm = async (body: CancelOrderBody) => {
    const baseVersion = snapshot.data?.syncVersion;
    if (!permitted || !eligible || !baseVersion || conflict || snapshot.isFetching || snapshot.error || inFlight.current) return;
    const previous = request.current;
    const reuse = previous?.baseVersion === baseVersion && JSON.stringify(previous.body) === JSON.stringify(body);
    const next = reuse ? previous : { id, body, baseVersion, mutationId: crypto.randomUUID(), version: Math.max(Date.now(), baseVersion + 1) };
    request.current = next;
    inFlight.current = true;
    try {
      const result = await mutation.mutateAsync(next);
      setOpen(false);
      if (result.outcome === 'deleted') onDeleted();
    } catch (error) {
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) setConflict(true);
    } finally {
      inFlight.current = false;
    }
  };

  let error = snapshot.error?.message ?? mutation.error?.message;
  if (!error && auditedOrder && !eligible) {
    error = auditedOrder.status === 'processing' ? 'Payment information is unavailable. Reload the app before canceling.' : 'This order can no longer be canceled.';
  }
  const preview = auditedOrder ?? order;
  return { start, pending: mutation.isPending, dialog: open && preview ? {
    order: preview, review, loading: snapshot.isFetching || snapshot.isPending && !snapshot.error,
    error, onReload: conflict || snapshot.error ? reload : undefined, pending: mutation.isPending,
    onCancel: close, onConfirm: confirm,
  } : null };
};
