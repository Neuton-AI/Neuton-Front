import type React from 'react';
import { SheetSection } from '@/components/Sheet/Sheet';
import type { OrderDetail } from '@/features/orders/types';
import { formatDate, formatQuantity } from '@/lib/format';

interface IOrderCancellation { order: OrderDetail }

export const OrderCancellation: React.FC<IOrderCancellation> = ({ order }) => {
  let production = 'Production answer unavailable.';
  if (order.cancellationMadeItems === true) production = 'Items were made for this order.';
  if (order.cancellationMadeItems === false) production = 'Nothing was made for this order.';
  const stockAdded = order.stockAdded ?? [];
  const itemNames = new Map(order.items.map(line => [line.id, line.name]));
  return <SheetSection title="Cancellation">
    <p className="text-label text-ink-muted">{production}</p>
    {order.cancelledAt && <time className="text-label text-ink-muted" dateTime={order.cancelledAt}>{formatDate(order.cancelledAt)}</time>}
    {stockAdded.length > 0 && <div className="space-y-1 rounded-[9px] bg-[#D8EFE8] px-3 py-2 text-label text-[#225D51]">
      <p className="font-semibold">Added to inventory</p>
      <ul aria-label="Finished stock added" className="list-disc ps-4">
        {stockAdded.map(stock => <li key={stock.id} className="break-words">
          {formatQuantity(stock.quantityAdded)} × {itemNames.get(stock.sourceOrderItemId) ?? 'Finished item'}
        </li>)}
      </ul>
    </div>}
    {stockAdded.length === 0 && order.cancellationMadeItems === true && (
      <p className="text-label text-ink-muted">No finished stock added.</p>
    )}
  </SheetSection>;
};
