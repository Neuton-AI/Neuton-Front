import type React from "react";
import { Link } from "react-router-dom";

export const NewOrderAction: React.FC = () => (
  <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottom-nav-height)+28px)] z-30 mx-auto max-w-shell pl-[max(16px,var(--safe-left))] pr-[max(16px,var(--safe-right))]">
    <Link
      to="/orders/new"
      className="pressable pointer-events-auto flex h-14 w-full items-center justify-center rounded-pill bg-brand-primary text-[14px] font-medium text-ink-on-primary shadow-[0_8px_24px_rgba(204,120,92,0.32)]"
    >
      Add New Order
    </Link>
  </div>
);
