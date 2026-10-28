import type React from "react";
import { StatCard } from "@/components/StatCard/StatCard";
import { formatMoney } from "@/lib/format";
import type { DashboardPageModel } from "../../DashboardPage.module";

interface IDashboardMetrics extends Pick<
  DashboardPageModel,
  | "summary"
  | "currency"
  | "periodLabel"
  | "data"
  | "profitability"
  | "setProfitability"
  | "profitPerOrder"
> {
  data: Pick<
    DashboardPageModel,
    | "summary"
    | "currency"
    | "periodLabel"
    | "data"
    | "profitability"
    | "setProfitability"
    | "profitPerOrder"
  >["data"];
}

export const DashboardMetrics: React.FC<IDashboardMetrics> = ({
  summary,
  currency,
  periodLabel,
  data,
  profitability,
  setProfitability,
  profitPerOrder,
}) => {
  return (
    <>
      <div className="flex gap-3">
        <StatCard
          label="Revenue"
          tone="card"
          className="flex-1"
          labelClassName="text-ink-muted opacity-100"
          value={formatMoney(summary?.revenue, currency)}
          sub={`Gross income · ${periodLabel}`}
        />
        <StatCard
          label="Expenses"
          tone="card"
          className="flex-1"
          labelClassName="text-ink-muted opacity-100"
          value={formatMoney(summary?.expenses, currency)}
          sub={`Operational · ${periodLabel}`}
        />
      </div>
      <div className="flex gap-3">
        <StatCard
          label="Top item"
          tone="primary"
          className="flex-1 justify-between"
          labelClassName="text-ink-on-primary opacity-100"
          middle={
            <div className="flex flex-col gap-1.5">
              <p className="font-display text-card-value text-ink-on-primary line-clamp-2">
                {data?.topItem?.name ?? "—"}
              </p>
              <p className="text-label font-medium text-ink-on-primary">
                {data?.topItem
                  ? `${data.topItem.unitsSold} sold · ${periodLabel}`
                  : "No sales yet"}
              </p>
            </div>
          }
        />
        <StatCard
          label="Profit / order"
          tone="card"
          className="flex-1"
          labelClassName="text-ink-muted opacity-100"
          middle={
            <div className="flex w-fit gap-0.5 rounded-full bg-[#E8E0D2] p-0.5">
              {(["average", "median"] as const).map((mode) => (
                <button
                  key={mode}
                  role="tab"
                  aria-selected={profitability === mode}
                  type="button"
                  onClick={() => setProfitability(mode)}
                  className={`rounded-full px-2 py-[3px] text-[13px] font-medium leading-[18px] transition-colors duration-200 ${
                    profitability === mode
                      ? "bg-[#FAF9F5] text-[#141413]"
                      : "text-[#6C6A64]"
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          }
          value={formatMoney(profitPerOrder, currency)}
          sub={
            <>
              avg · {data?.orderProfitability.sampleSize ?? 0} orders ·{" "}
              {periodLabel}
            </>
          }
        />
      </div>
    </>
  );
};
