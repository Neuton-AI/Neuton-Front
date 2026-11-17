import type React from "react";
import type { StatusFilter } from "@/features/orders/types";

export const OrdersEmpty: React.FC<{ status: StatusFilter }> = ({ status }) => {
  const isUnfiltered = status === "all";
  const statusName = status === "cancelled" ? "canceled" : status;

  return (
    <div
      role="status"
      className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center"
    >
      <svg
        aria-hidden="true"
        className="mb-5 h-12 w-12 shrink-0 text-ink-muted"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 4 6 12v28a4 4 0 0 0 4 4h28a4 4 0 0 0 4-4V12l-6-8Z" />
        <path d="M6 12h36M32 20a8 8 0 0 1-16 0" />
      </svg>
      <h2 className="font-display text-card-value tracking-normal text-ink">
        {isUnfiltered ? "No orders yet" : `No ${statusName} orders`}
      </h2>
      <p className="max-w-[270px] text-sm leading-[18px] text-ink-muted">
        {isUnfiltered
          ? "Log your first sale to start tracking revenue, delivery fees and profit per order."
          : "Try a different status to see more orders."}
      </p>
    </div>
  );
};
