import { ConfirmDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import { InlineNotice } from '@/components/feedback';
import { SheetBadge } from '@/components/Sheet/Sheet';
import { Field, Input } from '@/components/ui';
import type { OrderDetail } from '@/features/orders/types';
import { formatDate } from '@/lib/format';
import type { ShopId, UserId } from '@/lib/queryTypes';
import type React from 'react';
import { useOrderPayments } from './OrderPayments.module';
import { OrderRefund } from './OrderRefund';

interface IOrderPayments {
  order: OrderDetail;
  currency: string;
  canEdit: boolean;
  userId: UserId;
  shopId: ShopId;
}

const kindLabels = { deposit: 'Deposit', payment: 'Payment', refund: 'Refund' };

export const OrderPayments: React.FC<IOrderPayments> = ({ order, currency, canEdit, userId, shopId }) => {
  const model = useOrderPayments(order, currency, canEdit, userId, shopId);
  const { summary, renderMoney } = model;
  const refund = order.paymentHistory?.find(payment => payment.kind === 'refund');
  return (
    <section aria-labelledby="order-payments-heading" className="flex flex-col gap-2 rounded-card border border-hairline bg-surface-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="order-payments-heading" className="text-[18px] font-medium text-ink">Payments</h2>
        {model.status && <SheetBadge tone={summary?.status === 'pending_refund' ? 'card' : 'teal'}>{model.status}</SheetBadge>}
      </div>
      {summary && <dl className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-1 text-label tabular-nums">
        <dt className="text-ink-muted">Received</dt><dd>{renderMoney(summary.totalReceived)}</dd>
        {order.status !== 'cancelled' && <>
          <dt className="text-ink-muted">Balance due</dt><dd>{renderMoney(summary.balanceDue)}</dd>
        </>}
        {summary.status === 'pending_refund' && <>
          <dt className="text-ink-muted">Refund due</dt><dd className="font-semibold">{renderMoney(summary.refundDue)}</dd>
        </>}
        {summary.status === 'refunded' && refund && <>
          <dt className="text-ink-muted">Refunded</dt><dd className="font-semibold">{renderMoney(refund.amount)}</dd>
        </>}
      </dl>}
      {!!order.paymentHistory?.length && <ul aria-label="Payment history" className="divide-y divide-hairline">
        {order.paymentHistory.map(payment => <li key={payment.id} className="flex justify-between gap-2 py-2 text-label">
          <span>{kindLabels[payment.kind]} <time dateTime={payment.occurredAt} className="block text-ink-muted">{formatDate(payment.occurredAt)}</time></span>
          <span className="tabular-nums">{renderMoney(payment.kind === 'refund' ? `-${payment.amount}` : payment.amount)}</span>
        </li>)}
      </ul>}
      {model.canRecord && <button type="button" className="pressable min-h-11 rounded-[10px] border border-hairline bg-surface-canvas text-label font-semibold text-ink"
        onClick={model.openForm}>Record payment</button>}
      {canEdit && order.status === 'cancelled' &&
        <OrderRefund order={order} renderMoney={renderMoney} userId={userId} shopId={shopId} />}
      <ConfirmDialog open={model.open} variant="standard" title="Record payment" cancelLabel="Back"
        description={`Order #${order.orderNumber}${order.customerName ? ` · ${order.customerName}` : ''}`}
        confirmLabel={model.pending ? 'Recording…' : 'Record payment'} onCancel={model.closeForm} onConfirm={model.confirm}
        pending={model.pending} confirmDisabled={!model.canConfirm} feedback={<div className="flex min-w-0 flex-col gap-3">
          <fieldset disabled={model.pending} className="flex min-w-0 flex-col gap-3">
            <legend className="mb-1.5 text-label font-medium text-ink-muted">Payment type</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['deposit', 'payment'] as const).map(kind => <label key={kind}
                className="pressable flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] border border-hairline text-label has-[:checked]:bg-brand-teal has-[:focus-visible]:outline-2">
                <input type="radio" name="payment-kind" className="sr-only" checked={model.kind === kind} onChange={() => model.setKind(kind)} />
                {kindLabels[kind]}
              </label>)}
            </div>
            <Field label="Amount" htmlFor="order-payment-amount"><Input id="order-payment-amount" type="number" inputMode="decimal"
              min="0.01" max="99999999.99" step="0.01" value={model.amount} onChange={e => model.setAmount(e.target.value)} /></Field>
            <Field label="Received on" htmlFor="order-payment-date"><Input id="order-payment-date" type="datetime-local"
              className="min-w-0 w-full" value={model.receivedOn} onChange={e => model.setReceivedOn(e.target.value)} /></Field>
          </fieldset>
          {model.loading && <p role="status" className="text-label text-ink-muted">Checking the current balance…</p>}
          {model.remaining && <p className="rounded-[10px] bg-surface-card px-3 py-2 text-label">Balance due after payment · {model.remaining}</p>}
          {model.error && <InlineNotice tone="error">{model.error}</InlineNotice>}
          {model.showReload && <button type="button" className="pressable min-h-11 text-label underline" disabled={model.loading} onClick={model.reload}>Reload order</button>}
        </div>} />
    </section>
  );
};
