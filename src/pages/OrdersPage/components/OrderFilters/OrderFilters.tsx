import type React from "react";
import type { OrderStatus } from "@/features/orders/types";
import type { OrdersPageModel } from "../../OrdersPage.module";

type StatusFilter = "all" | OrderStatus;
const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "processing", label: "Processing" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Canceled" },
];

interface IOrderFilters {
  statusFilter: OrdersPageModel["statusFilter"];
  onSelect: OrdersPageModel["setStatusFilter"];
}

export const OrderFilters: React.FC<IOrderFilters> = ({
  statusFilter,
  onSelect,
}) => {
  return (
    <div
      role="tablist"
      aria-label="Order status filter"
      className="mx-4 mt-1 flex gap-1 rounded-card border border-hairline bg-surface-soft p-1"
    >
      {STATUS_FILTERS.map(({ key, label }) => (
        <button
          key={key}
          role="tab"
          aria-selected={statusFilter === key}
          type="button"
          onClick={() => onSelect(key)}
          className={`pressable flex min-w-max flex-1 items-center justify-center whitespace-nowrap rounded-input px-1 py-2 text-sm font-medium leading-[1.4] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary-active ${
            statusFilter === key
              ? "bg-surface-card text-ink"
              : "text-ink-muted"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
