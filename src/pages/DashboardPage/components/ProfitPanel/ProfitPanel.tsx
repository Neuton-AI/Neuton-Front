import type React from "react";
import { formatMoney, formatPercent } from "@/lib/format";
import {
  DASHBOARD_PERIODS,
  type DashboardPageModel,
} from "../../DashboardPage.module";
import { ProfitChart } from "../ProfitChart/ProfitChart";

interface IProfitPanel extends Pick<
  DashboardPageModel,
  | "summary"
  | "isLoading"
  | "data"
  | "currency"
  | "trend"
  | "series"
  | "period"
  | "setPeriod"
> {
  data: Pick<
    DashboardPageModel,
    | "summary"
    | "isLoading"
    | "data"
    | "currency"
    | "trend"
    | "series"
    | "period"
    | "setPeriod"
  >["data"];
}

export const ProfitPanel: React.FC<IProfitPanel> = ({
  summary,
  isLoading,
  data,
  currency,
  trend,
  series,
  period,
  setPeriod,
}) => {
  return (
    <section
      aria-label="Net profit"
      className="flex flex-col gap-2.5 overflow-hidden rounded-xl bg-[#181715] p-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[12px] font-medium uppercase leading-[17px] tracking-[1.5px] text-[#A09D96]">
            Net profit
          </p>
          <p className="font-['Cormorant_Garamond',serif] text-[36px] leading-[43.6px] tracking-[-0.5px] text-[#FAF9F5]">
            {isLoading && !data
              ? "—"
              : formatMoney(summary?.netProfit, currency)}
          </p>
        </div>
        {trend ? (
          <span className="shrink-0 rounded-full bg-[#5DB8A6] px-2.5 py-1 text-[13px] font-medium leading-[18px] text-[#141413]">
            {formatPercent(trend.profitPercent)}
          </span>
        ) : null}
      </div>
      <div className="h-[104px] w-full">
        <ProfitChart points={series} currency={currency} />
      </div>
      <div role="tablist" aria-label="Period" className="mt-0.5 flex gap-1.5">
        {DASHBOARD_PERIODS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={period === key}
            type="button"
            onClick={() => setPeriod(key)}
            className={`rounded-full px-3 py-1.5 text-[13px] font-medium leading-[18px] transition-colors duration-200 ${
              period === key ? "bg-[#252320] text-[#FAF9F5]" : "text-[#A09D96]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
};
