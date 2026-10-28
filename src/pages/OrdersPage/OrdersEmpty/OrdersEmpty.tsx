import { IconBag } from '@/components/icons';

export function OrdersEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-[136px] w-[136px] items-center justify-center rounded-full bg-surface-card">
        <div className="flex h-[92px] w-[92px] items-center justify-center rounded-full bg-surface-canvas text-ink-muted shadow-sm">
          <IconBag className="h-10 w-10" />
        </div>
      </div>
      <div className="h-2" />
      <h2 className="font-display text-[28px] leading-tight text-ink">No orders yet</h2>
      <p className="max-w-[270px] text-[14px] leading-normal text-ink-muted">
        Log your first sale to start tracking revenue, delivery fees and profit per order.
      </p>
      <p className="text-[13px] font-medium leading-normal text-ink-muted">Tap Add New Order below</p>
    </div>
  );
}
