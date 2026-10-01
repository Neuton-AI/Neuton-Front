import { useMemo } from 'react';
import type { DashboardPeriod, DashboardSummary } from './api';

export type ChartPoint = { date: string; netProfit: number };

/**
 * The backend returns one point per day that has orders. The chart wants an
 * evenly spaced series, so gaps are filled with zero and long periods are
 * bucketed to keep the sparkline readable.
 */
export function useChartSeries(
  graph: DashboardSummary['graph'],
  period: DashboardPeriod,
): ChartPoint[] {
  return useMemo(() => bucketSeries(graph, period), [graph, period]);
}

const BUCKET: Record<DashboardPeriod, 'day' | 'week' | 'month'> = {
  '7d': 'day',
  '30d': 'day',
  '90d': 'week',
  '12m': 'month',
};

const BUCKETS_PER_PERIOD: Record<DashboardPeriod, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 13,
  '12m': 12,
};

export function bucketSeries(graph: ChartPoint[], period: DashboardPeriod): ChartPoint[] {
  if (graph.length === 0) return [];

  const step = BUCKET[period];
  const totals = new Map<string, number>();

  for (const point of graph) {
    const key = bucketKey(point.date, step);
    totals.set(key, (totals.get(key) ?? 0) + Number(point.netProfit ?? 0));
  }

  const wanted = BUCKETS_PER_PERIOD[period];
  const lastKey = bucketKey(graph[graph.length - 1]!.date, step);
  const keys = trailingKeys(lastKey, step, wanted);

  return keys.map((key) => ({
    date: key,
    netProfit: round2(totals.get(key) ?? 0),
  }));
}

function bucketKey(day: string, step: 'day' | 'week' | 'month'): string {
  const date = new Date(`${day.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return day.slice(0, 10);

  if (step === 'month') return date.toISOString().slice(0, 7);
  if (step === 'week') {
    // ISO weeks start Monday; shift Sunday (0) back to the previous Monday.
    const monday = new Date(date);
    const offset = (monday.getUTCDay() + 6) % 7;
    monday.setUTCDate(monday.getUTCDate() - offset);
    return monday.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function trailingKeys(lastKey: string, step: 'day' | 'week' | 'month', count: number): string[] {
  const anchor = new Date(
    step === 'month' ? `${lastKey}-01T00:00:00Z` : `${lastKey}T00:00:00Z`,
  );
  if (Number.isNaN(anchor.getTime())) return [lastKey];

  const keys: string[] = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    const cursor = new Date(anchor);
    if (step === 'month') cursor.setUTCMonth(cursor.getUTCMonth() - back);
    else cursor.setUTCDate(cursor.getUTCDate() - back * 7);
    keys.push(cursor.toISOString().slice(step === 'month' ? 0 : 10, step === 'month' ? 7 : 10));
  }
  return keys;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}