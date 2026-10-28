import type React from "react";
import { SheetBadge, SheetSection } from "@/components/Sheet/Sheet";
import { IconPin } from "@/components/icons";
import {
  getOrderStatusLabel,
  getOrderStatusTone,
} from "@/features/orders/orderStatus";
import { formatDate, formatMoney, formatQuantity } from "@/lib/format";
import type { OrderDetailPageModel } from "../../OrderDetailPage.module";

type Order = NonNullable<OrderDetailPageModel["order"]>;

interface IOrderSummary {
  order: Order;
  currency: string;
  marginPercent: number;
}

export const OrderSummary: React.FC<IOrderSummary> = ({
  order,
  currency,
  marginPercent,
}) => {
  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-eyebrow font-medium uppercase text-ink-muted">
          Order
        </p>
        <h1 className="font-display text-card-value text-ink">
          {order.customerName ?? "Unnamed customer"}
        </h1>
        <p className="text-label font-medium text-ink-muted">
          {formatDate(order.orderDate)} · #{order.orderNumber}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <SheetBadge tone={getOrderStatusTone(order.status)}>
            {getOrderStatusLabel(order.status)}
          </SheetBadge>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5 rounded-card bg-brand-primary p-4">
          <p className="text-eyebrow font-medium uppercase text-ink-on-primary">
            Total
          </p>
          <p className="font-display text-card-value text-ink-on-primary">
            {formatMoney(order.totalAmount, currency)}
          </p>
          <p className="text-label font-medium text-ink-on-primary">
            Incl. {formatMoney(order.deliveryFee, currency)} delivery
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 rounded-card bg-surface-dark p-4">
          <p className="text-eyebrow font-medium uppercase text-ink-on-dark-soft">
            Profit margin
          </p>
          <p className="font-display text-card-value text-ink-on-dark">
            {marginPercent.toFixed(0)}%
          </p>
          <p className="text-label font-medium text-ink-on-dark-soft">
            Profit {formatMoney(order.netProfit, currency)}
          </p>
        </div>
      </div>
    </>
  );
};

interface IOrderItems {
  order: Order;
  currency: string;
}

export const OrderItems: React.FC<IOrderItems> = ({ order, currency }) => {
  return (
    <SheetSection title="Items ordered">
      {order.items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-3 border-b border-hairline-soft py-1.5 last:border-b-0"
        >
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-body text-ink">{item.name}</span>
            <span className="text-label font-medium text-ink-muted">
              {formatQuantity(item.quantity)} ×{" "}
              {formatMoney(item.unitPrice, currency)}
            </span>
          </div>
          <span className="shrink-0 text-body text-ink">
            {formatMoney(item.lineTotal, currency)}
          </span>
        </div>
      ))}
    </SheetSection>
  );
};

interface IOrderDelivery {
  order: Order;
  currency: string;
  distanceFee: number | string;
  baseFee: number | string;
  rate: number | string | null | undefined;
}

export const OrderDelivery: React.FC<IOrderDelivery> = ({
  order,
  currency,
  distanceFee,
  baseFee,
  rate,
}) => {
  return (
    <SheetSection title="Delivery">
      {order.destinationAddress ? (
        <div className="flex items-start gap-2 py-1">
          <IconPin className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink-muted" />
          <span className="text-body text-ink">{order.destinationAddress}</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3 border-b border-hairline-soft py-1.5">
        <div className="flex min-w-0 flex-col">
          <span className="text-body text-ink">Distance fee</span>
          <span className="text-label font-medium text-ink-muted">
            {Number(order.deliveryDistanceKm).toFixed(1)} km ×{" "}
            {formatMoney(rate, currency)} / km
          </span>
        </div>
        <span className="shrink-0 text-body text-ink">
          {formatMoney(distanceFee, currency)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 border-b border-hairline-soft py-1.5">
        <span className="text-body text-ink-body">Base fee</span>
        <span className="text-body text-ink">
          {formatMoney(baseFee, currency)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 py-1.5">
        <span className="text-[16px] font-medium text-ink">Delivery fee</span>
        <span className="text-[16px] font-medium text-ink">
          {formatMoney(order.deliveryFee, currency)}
        </span>
      </div>
    </SheetSection>
  );
};
