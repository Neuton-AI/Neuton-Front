import type React from "react";
import { IconPlus } from "@/components/icons";
import { Link } from "react-router-dom";

export const NewOrderAction: React.FC = () => (
  <Link
    to="/orders/new"
    className="pressable mt-3.5 flex h-10 items-center gap-2 rounded-input border border-hairline bg-surface-canvas px-3.5 text-sm font-medium leading-none text-ink hover:bg-surface-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary-active"
  >
    <IconPlus className="h-4 w-4 shrink-0" />
    New order
  </Link>
);
