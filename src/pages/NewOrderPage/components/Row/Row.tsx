import type React from "react";
interface IRow {
  label: string;
  value: string;
  emphasis?: boolean;
}

export const Row: React.FC<IRow> = ({ label, value, emphasis = false }) => {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={`text-label ${emphasis ? "font-medium text-ink" : "text-ink-muted"}`}
      >
        {label}
      </span>
      <span
        className={
          emphasis ? "font-display text-[20px] text-ink" : "text-body text-ink"
        }
      >
        {value}
      </span>
    </div>
  );
};
