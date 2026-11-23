import { ConfirmDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import { InlineNotice } from '@/components/feedback';
import { Field, Input } from '@/components/ui';
import type { OrderDetail } from '@/features/orders/types';
import type { ShopId, UserId } from '@/lib/queryTypes';
import { useOrderRefund } from './OrderRefund.module';

interface IOrderRefund {
  order: OrderDetail;
  renderMoney: (amount: string) => string;
  userId: UserId;
  shopId: ShopId;
}

export function OrderRefund({ order, renderMoney, userId, shopId }: IOrderRefund) {
  const model = useOrderRefund(order.id, userId, shopId);
  return <>
    {order.paymentSummary?.status === 'pending_refund' && <button type="button"
      className="pressable min-h-11 rounded-[10px] bg-brand-primary text-label font-semibold text-ink hover:bg-brand-primary/90"
      onClick={model.openForm}>Record refund</button>}
    <ConfirmDialog open={model.open} variant="standard" title="Record refund" cancelLabel="Back"
      description={`Order #${order.orderNumber}${order.customerName ? ` · ${order.customerName}` : ''}`}
      confirmLabel={model.pending ? 'Recording…' : 'Record refund'} onCancel={model.closeForm} onConfirm={model.confirm}
      pending={model.pending} confirmDisabled={!model.canConfirm} feedback={<div className="flex min-w-0 flex-col gap-3">
        {model.refundDue && <p className="rounded-[10px] bg-surface-card px-3 py-2 text-label font-semibold">
          Refund due · {renderMoney(model.refundDue)}
        </p>}
        {model.loading && <p role="status" className="text-label text-ink-muted">Checking the current refund…</p>}
        <fieldset disabled={model.pending} className="flex min-w-0 flex-col gap-2">
          <Field label="Refunded on" htmlFor="order-refund-date"><Input id="order-refund-date" type="date"
            className="min-w-0 w-full" value={model.refundedOn} onChange={event => model.setRefundedOn(event.target.value)} /></Field>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-label text-ink">
            <input type="checkbox" className="size-[18px] shrink-0 accent-brand-primary" checked={model.confirmed}
              disabled={!model.ready} onChange={event => model.setConfirmed(event.target.checked)} />
            I've already returned this amount to the customer.
          </label>
        </fieldset>
        {model.error && <InlineNotice tone="error">{model.error}</InlineNotice>}
        {model.showReload && <button type="button" className="pressable min-h-11 text-label underline"
          disabled={model.loading} onClick={model.reload}>Reload order</button>}
      </div>} />
  </>;
}
