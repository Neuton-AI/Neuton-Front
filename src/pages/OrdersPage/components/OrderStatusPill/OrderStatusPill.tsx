import type React from "react";
import { getOrderStatusLabel } from "@/features/orders/orderStatus";
import type { OrderStatus } from "@/features/orders/types";
interface IOrderStatusPill {
  status: OrderStatus;
}

export const OrderStatusPill: React.FC<IOrderStatusPill> = ({ status }) => {
  if (status === "cancelled") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-pill bg-deleted-badge px-2.5 py-1 text-[11px] font-semibold uppercase leading-tight tracking-[0.66px] text-ink-muted">
        {getOrderStatusLabel(status)}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-pill px-2 py-0.5 text-[11px] font-medium leading-tight text-ink ${
        status === "delivered" ? "bg-brand-teal/25" : "bg-brand-amber/20"
      }`}
    >
      {getOrderStatusLabel(status)}
    </span>
  );
};
