import { IconBag } from '@/components/icons';
import { formatDate, formatMoney } from '@/lib/format';
import { Link } from 'react-router-dom';
import { OrderStatusPill } from '../OrderStatusPill/OrderStatusPill';
import type { OrdersPageModel } from '../OrdersPage.module';

type Order = OrdersPageModel['visibleOrders'][number];

export function OrderRow({ order, currency }: { order: Order; currency: string }) {
  const { isDeleted } = order;
  return (
    <Link
      to={`/orders/${order.id}`}
      className={`pressable flex items-center gap-3 rounded-card border p-3.5 transition-colors ${
        isDeleted
          ? 'border-deleted-border bg-deleted-surface opacity-[0.72]'
          : 'border-hairline bg-surface-canvas hover:border-brand-primary/30'
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-ink-muted ${
          isDeleted ? 'bg-deleted-badge opacity-70' : 'bg-surface-card'
        }`}
      >
        <IconBag className="h-5 w-5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2
          className={`truncate text-[16px] font-medium leading-snug ${
            isDeleted ? 'text-ink-muted line-through' : 'text-ink'
          }`}
        >
          {order.header}
        </h2>
        <p
          className={`flex items-center gap-1.5 truncate text-[13px] leading-snug ${
            isDeleted ? 'text-ink-muted-soft' : 'text-ink-muted'
          }`}
        >
          <span className={`truncate ${isDeleted ? 'line-through' : ''}`}>{formatDate(order.orderDate)}</span>
          <OrderStatusPill status={order.status} />
        </p>
      </div>
      <span
        className={`shrink-0 text-[18px] font-medium leading-snug ${
          isDeleted ? 'text-ink-muted-soft line-through' : 'text-ink'
        }`}
      >
        {formatMoney(order.totalAmount, currency)}
      </span>
    </Link>
  );
}
