import type React from "react";
export const OrdersSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="flex h-[74px] items-center gap-3 rounded-card border border-hairline bg-surface-canvas p-3"
          aria-hidden="true"
        >
          <div className="h-11 w-11 shrink-0 rounded-[8px] bg-surface-card animate-pulse" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="h-4 w-[150px] max-w-[60%] rounded-[6px] bg-surface-card animate-pulse" />
            <div className="h-3 w-[90px] max-w-[40%] rounded-[6px] bg-surface-card animate-pulse" />
          </div>
          <div className="h-[18px] w-14 shrink-0 rounded-[6px] bg-surface-card animate-pulse" />
        </div>
      ))}
    </div>
  );
};
