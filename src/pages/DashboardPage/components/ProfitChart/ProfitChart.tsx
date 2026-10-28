import type React from "react";
import { type ChartPoint } from "@/features/analytics/usePeriodSeries";
import { formatMoney } from "@/lib/format";
import { useProfitChart } from "./ProfitChart.module";

interface IProfitChart {
  points: ChartPoint[];
  currency: string;
}

export const ProfitChart: React.FC<IProfitChart> = ({ points, currency }) => {
  const { W, H, values, x, y, line, area, lastIndex } = useProfitChart({
    points,
    currency,
  });
  if (points.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-label text-ink-on-dark-soft">
          No orders in this period yet
        </p>
      </div>
    );
  }
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Daily net profit, latest ${formatMoney(values[lastIndex], currency)}`}
    >
      <defs>
        <linearGradient id="profit-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8A55A" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#E8A55A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#profit-fill)" />
      <path
        d={line}
        fill="none"
        stroke="#E8A55A"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={x(lastIndex)}
        cy={y(values[lastIndex]!)}
        r={4}
        fill="#E8A55A"
      />
    </svg>
  );
};
