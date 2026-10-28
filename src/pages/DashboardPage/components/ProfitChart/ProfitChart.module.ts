import { type ChartPoint } from "@/features/analytics/usePeriodSeries";
import { toNumber } from "@/lib/format";

export function useProfitChart({
  points,
}: {
  points: ChartPoint[];
  currency: string;
}) {
  const W = 326;

  const H = 94;

  const PAD = 6;

  const values = points.map((point) => toNumber(point.netProfit));

  const max = Math.max(...values, 0);

  const min = Math.min(...values, 0);

  const span = max - min || 1;

  const x = (index: number) =>
    PAD + (index / (points.length - 1)) * (W - PAD * 2);

  const y = (value: number) => H - PAD - ((value - min) / span) * (H - PAD * 2);

  const line = points
    .map(
      (_point, index) =>
        `${index === 0 ? "M" : "L"}${x(index).toFixed(1)} ${y(values[index]!).toFixed(1)}`,
    )
    .join(" ");

  const area = `${line} L${x(points.length - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z`;

  const lastIndex = points.length - 1;

  return { W, H, values, x, y, line, area, lastIndex };
}
export type ProfitChartModel = ReturnType<typeof useProfitChart>;
