import { useCacheOrderSnapshot, useOrderForEdit, useRecordOrderRefund } from '@/features/orders/ordersApi';
import { ApiError } from '@/lib/api';
import type { ShopId, UserId } from '@/lib/queryTypes';
import { useRef, useState } from 'react';

export function useOrderRefund(id: string, userId: UserId, shopId: ShopId) {
  const [open, setOpen] = useState(false);
  const [refundedOn, setRefundedOn] = useState('');
  const [confirmedVersion, setConfirmedVersion] = useState<number | null>(null);
  const [requiresReload, setRequiresReload] = useState(false);
  const snapshot = useOrderForEdit(userId, shopId, id, open);
  const cache = useCacheOrderSnapshot(userId, shopId);
  const mutation = useRecordOrderRefund(userId, shopId);
  const request = useRef<Parameters<typeof mutation.mutateAsync>[0] | null>(null);
  const submitting = useRef(false);
  const current = snapshot.data?.order;
  const baseVersion = snapshot.data?.syncVersion;
  const summary = current?.paymentSummary;
  const refundDue = current?.status === 'cancelled' && summary?.status === 'pending_refund' ? summary.refundDue : null;
  const ready = Boolean(refundDue) && !requiresReload && !snapshot.isFetching && !snapshot.error;
  const confirmed = baseVersion !== undefined && confirmedVersion === baseVersion;
  const date = new Date(`${refundedOn}T00:00`);
  const canConfirm = ready && confirmed && Number.isFinite(date.getTime());

  const openForm = () => {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    request.current = null;
    mutation.reset();
    setRequiresReload(false);
    setConfirmedVersion(null);
    setRefundedOn(localDate);
    setOpen(true);
  };
  const closeForm = () => { if (!submitting.current) setOpen(false); };
  const reload = async () => {
    request.current = null;
    mutation.reset();
    setConfirmedVersion(null);
    const result = await snapshot.refetch();
    if (result.isSuccess) {
      await cache(result.data);
      setRequiresReload(false);
    }
  };
  const confirm = async () => {
    if (!canConfirm || baseVersion === undefined || submitting.current) return;
    const occurredAt = date.toISOString();
    const previous = request.current;
    const sameRequest = previous?.baseVersion === baseVersion && previous.body.occurredAt === occurredAt;
    const next = sameRequest ? previous : { id, baseVersion, body: { occurredAt },
      mutationId: crypto.randomUUID(), version: Math.max(Date.now(), baseVersion + 1) };
    request.current = next;
    submitting.current = true;
    try {
      await mutation.mutateAsync(next);
      setOpen(false);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
        setConfirmedVersion(null);
        setRequiresReload(true);
      }
    } finally {
      submitting.current = false;
    }
  };

  let error = mutation.error?.message ?? snapshot.error?.message;
  if (!error && snapshot.data && !snapshot.isFetching && !refundDue) error = 'This order has no refund due.';
  return { open, openForm, closeForm, confirm, reload, refundDue, ready, canConfirm, refundedOn, setRefundedOn,
    confirmed, setConfirmed: (checked: boolean) => setConfirmedVersion(checked ? baseVersion ?? null : null),
    pending: mutation.isPending, loading: snapshot.isFetching, error, showReload: requiresReload || !!snapshot.error };
}
