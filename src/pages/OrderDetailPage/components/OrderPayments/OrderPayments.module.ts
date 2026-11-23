import { useOrderForEdit, useRecordOrderPayment } from '@/features/orders/ordersApi';
import type { OrderDetail, OrderPaymentSummary, RecordPaymentBody } from '@/features/orders/types';
import { ApiError } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import type { ShopId, UserId } from '@/lib/queryTypes';
import { useRef, useState } from 'react';

const statusLabel: Record<OrderPaymentSummary['status'], string> = {
  unpaid: 'Unpaid', deposited: 'Deposited', paid: 'Paid', pending_refund: 'Pending refund', refunded: 'Refunded',
};

type PaymentRequest = { id: string; baseVersion: number; mutationId: string; version: number; body: RecordPaymentBody };

function localDateTime() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function cents(amount: string) {
  if (!/^\d{1,8}(\.\d{0,2})?$/.test(amount)) return 0;
  const [whole, fraction = ''] = amount.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export const useOrderPayments = (order: OrderDetail, currency: string, canEdit: boolean, userId: UserId, shopId: ShopId) => {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<RecordPaymentBody['kind']>('payment');
  const [enteredAmount, setAmount] = useState<string | null>(null);
  const [receivedOn, setReceivedOn] = useState('');
  const [requiresReload, setRequiresReload] = useState(false);
  const request = useRef<PaymentRequest | null>(null);
  const submitting = useRef(false);
  const snapshot = useOrderForEdit(userId, shopId, order.id, open && canEdit);
  const mutation = useRecordOrderPayment(userId, shopId);
  const summary = order.paymentSummary;
  const live = snapshot.data?.order;
  const availableBalance = live?.paymentSummary?.balanceDue ?? '0.00';
  const amount = enteredAmount ?? availableBalance;
  const amountCents = cents(amount);
  const balanceCents = cents(availableBalance);
  const timestamp = new Date(receivedOn);
  const eligible = live?.status === 'processing' && balanceCents > 0;
  const ready = canEdit && eligible && !requiresReload && !snapshot.isFetching && !snapshot.error;
  const validAmount = amountCents > 0 && amountCents <= balanceCents;
  const baseVersion = snapshot.data?.syncVersion;
  const canConfirm = ready && validAmount && Number.isFinite(timestamp.getTime()) && baseVersion !== undefined;
  const renderMoney = (value: string | number) => formatMoney(value, currency, { exact: true });

  const openForm = () => {
    request.current = null;
    mutation.reset();
    setRequiresReload(false);
    setKind('payment');
    setAmount(null);
    setReceivedOn(localDateTime());
    setOpen(true);
  };
  const closeForm = () => { if (!submitting.current) setOpen(false); };
  const reload = async () => {
    request.current = null;
    mutation.reset();
    const result = await snapshot.refetch();
    if (result.isSuccess) setRequiresReload(false);
  };
  const confirm = async () => {
    if (!canConfirm || baseVersion === undefined || submitting.current) return;
    const body = { kind, amount: (amountCents / 100).toFixed(2), occurredAt: timestamp.toISOString() };
    const previous = request.current;
    const sameRequest = previous?.baseVersion === baseVersion && previous.body.kind === body.kind &&
      previous.body.amount === body.amount && previous.body.occurredAt === body.occurredAt;
    const next = sameRequest ? previous : { id: order.id, baseVersion, body,
      mutationId: crypto.randomUUID(), version: Math.max(Date.now(), baseVersion + 1) };
    request.current = next;
    submitting.current = true;
    try {
      await mutation.mutateAsync(next);
      setOpen(false);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
        setAmount(amount);
        setRequiresReload(true);
      }
    } finally {
      submitting.current = false;
    }
  };

  let error = mutation.error?.message ?? snapshot.error?.message;
  if (!error && snapshot.data && !snapshot.isFetching && !eligible) error = 'This order can no longer receive a payment.';
  if (!error && ready && amount && !validAmount) error = 'Enter a positive amount up to the current balance.';
  return { summary, status: summary && statusLabel[summary.status], renderMoney, open, amount, kind, receivedOn,
    canRecord: canEdit && order.status === 'processing' && cents(summary?.balanceDue ?? order.totalAmount) > 0,
    openForm, closeForm, confirm, reload, setAmount, setKind, setReceivedOn, canConfirm,
    pending: mutation.isPending, loading: snapshot.isFetching, error, showReload: requiresReload || !!snapshot.error,
    remaining: ready && validAmount ? renderMoney((balanceCents - amountCents) / 100) : null };
};
