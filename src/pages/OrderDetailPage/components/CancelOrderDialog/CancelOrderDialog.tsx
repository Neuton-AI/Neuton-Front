import type React from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import { InlineNotice } from '@/components/feedback';
import { Input } from '@/components/ui';
import type { CancelOrderBody, OrderDetail } from '@/features/orders/types';
import { formatQuantity } from '@/lib/format';
import { useCancelOrderDialog, type CancellationLine } from './CancelOrderDialog.module';

interface ICancelOrderDialog {
  order: OrderDetail;
  currency: string;
  pending?: boolean;
  loading?: boolean;
  error?: string | null;
  onReload?: () => void;
  onConfirm: (body: CancelOrderBody) => void;
  onCancel: () => void;
}

interface IStockLine {
  line: CancellationLine;
  select: (id: string, checked: boolean, max: number) => void;
  setQuantity: (id: string, quantity: string) => void;
}

const StockLine: React.FC<IStockLine> = ({ line, select, setQuantity }) => (
  <li className="grid min-h-12 grid-cols-[1fr_70px] items-center gap-2 py-1.5">
    <label className="flex min-w-0 items-center gap-2 break-words">
      <input type="checkbox" className="size-4 shrink-0 accent-brand-teal" aria-label={`Add ${line.name}`}
        checked={line.entered !== undefined} disabled={line.maximum < 1}
        onChange={event => select(line.id, event.target.checked, line.maximum)} />
      <span className="min-w-0 text-label font-medium">{line.name}<span className="block font-normal text-ink-muted">{formatQuantity(line.quantity)} ordered</span></span>
    </label>
    {line.entered === undefined ? <span className="text-center text-ink-muted">—</span> : (
      <Input dense type="number" inputMode="numeric" min={1} max={line.maximum} step={1}
        aria-label={`Quantity of ${line.name} to add`} value={line.entered} onChange={event => setQuantity(line.id, event.target.value)} />
    )}
  </li>
);

export const CancelOrderDialog: React.FC<ICancelOrderDialog> = ({ order, currency, pending = false,
  loading = false, error, onReload, onConfirm, onCancel }) => {
  const model = useCancelOrderDialog(order, currency, onConfirm);
  return <ConfirmDialog open variant="standard" title="Cancel order"
    description={`Order #${order.orderNumber}${order.customerName ? ` · ${order.customerName}` : ''}`}
    cancelLabel="Keep order" confirmLabel={model.permanent ? 'Delete order' : 'Cancel order'}
    confirmDisabled={loading || !!onReload || model.madeItems === null || model.invalid || !model.hasPaymentData}
    pending={pending} onConfirm={model.confirm} onCancel={onCancel} feedback={<div className="flex flex-col gap-3">
      <fieldset disabled={pending || loading} className="min-w-0">
        <legend className="mb-2 text-label font-semibold text-ink">Was anything made for this order?</legend>
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map(answer => <label key={String(answer)} className="pressable relative grid min-h-11 cursor-pointer place-items-center rounded-[10px] border border-hairline text-label has-[:checked]:bg-brand-teal has-[:focus-visible]:outline-2">
            <input className="absolute inset-0 size-full cursor-pointer opacity-0" type="radio" name="made-items"
              checked={model.madeItems === answer} onChange={() => model.choose(answer)} />
            {answer ? 'Yes' : 'No'}
          </label>)}
        </div>
      </fieldset>
      {model.madeItems && <fieldset disabled={pending || loading} className="min-w-0">
        <legend className="mb-2 text-label font-semibold">Add finished items to inventory?</legend>
        <div className="flex justify-between gap-2 text-label text-ink-muted"><span>Items ordered</span><span>Qty to add</span></div>
        <ul className="divide-y divide-hairline">{model.lines.map(line => <StockLine key={line.id} line={line}
          select={model.selectLine} setQuantity={model.setQuantity} />)}</ul>
        {model.invalid && <InlineNotice tone="error">Enter a whole number within the quantity ordered.</InlineNotice>}
      </fieldset>}
      {model.madeItems !== null && model.hasPaymentData && <div className="space-y-1 rounded-[10px] bg-surface-card px-3 py-2 text-label">
        {model.permanent ? <><strong>This order will be permanently deleted.</strong><p>No payment is recorded. The order number stays retired.</p></> : <>
          {model.refund && <strong>Refund due · {model.refund}</strong>}
          <p>The order stays in history as Canceled.</p>
          {model.madeItems && (model.selected.length ? <ul>{model.selected.map(line => <li key={line.id}>{line.name} · {line.entered || '—'} to add</li>)}</ul> : <p>No stock will be added.</p>)}
        </>}
      </div>}
      {loading && <p role="status" className="text-label text-ink-muted">Checking the current order…</p>}
      {pending && <p role="status" className="text-label text-ink-muted">Saving cancellation…</p>}
      {error && <InlineNotice tone="error">{error}</InlineNotice>}
      {onReload && <button type="button" className="pressable min-h-11 text-label underline" disabled={loading || pending} onClick={onReload}>Reload order</button>}
    </div>} />;
};
