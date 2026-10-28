import type React from "react";
import type { OrderStatus } from "@/features/orders/types";
import type { OrdersPageModel } from "../../OrdersPage.module";

type StatusFilter = "all" | OrderStatus;
const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "processing", label: "Processing" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Deleted" },
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
      className="no-scrollbar mt-4 flex gap-1.5 overflow-x-auto px-4"
    >
      {STATUS_FILTERS.map(({ key, label }) => (
        <button
          key={key}
          role="tab"
          aria-selected={statusFilter === key}
          type="button"
          onClick={() => onSelect(key)}
          className={`pressable flex shrink-0 items-center gap-1.5 rounded-pill px-3.5 py-2 text-label font-medium transition-colors duration-200 ${
            statusFilter === key
              ? "bg-surface-dark text-ink-on-dark"
              : "bg-surface-card text-ink-muted"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
