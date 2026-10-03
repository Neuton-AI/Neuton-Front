import { describe, expect, it } from 'vitest';
import { bucketSeries, type ChartPoint } from './usePeriodSeries';

/**
 * The backend only returns days that had orders. The chart needs a gapless
 * series, so missing days must read as a real zero rather than being skipped —
 * a skipped day silently distorts the sparkline's shape.
 */

const graph = (...points: [string, number][]): ChartPoint[] =>
  points.map(([date, netProfit]) => ({ date, netProfit }));

/**
 * KNOWN DEFECT — found by this file on its first run, not yet in the backlog.
 * `bucketSeries` is broken twice over on the daily periods, in
 * usePeriodSeries.ts `trailingKeys`:
 *
 *  1. Line 79 slices `iso.slice(step === 'month' ? 0 : 10, step === 'month' ? 7 : 10)`.
 *     For any non-month period that is `slice(10, 10)` — the empty string. The
 *     intent was `slice(0, 10)`. Every generated key becomes `''`.
 *  2. Line 78 strides `cursor.setUTCDate(cursor.getUTCDate() - back * 7)` — a
 *     hardcoded *weekly* step, applied even when `step` is `'day'`. So the daily
 *     periods walk back in 7-day jumps regardless.
 *
 * Combined effect: on 7d and 30d only the final key matches a real data point,
 * so the chart shows one correct value and the rest as zero — on a wrongly
 * spaced axis, and over a 210-day span for `30d`. 90d survives the stride (it
 * wants weekly) and is only hit by defect 1. 12m is the only fully correct
 * period, because its branch slices (0, 7) and steps by month.
 *
 * These are written with `it.fails` on purpose. They state the correct
 * behaviour, so the moment the fix lands they start failing loudly and whoever
 * fixes it has to remove the markers. Asserting today's broken output instead
 * would cement it.
 */
const KNOWN_DAILY_BUCKETS =
  'usePeriodSeries.ts trailingKeys: slices (10,10) not (0,10), and strides 7 days for daily buckets';

describe('bucketSeries', () => {
  it('returns nothing to plot for an empty response', () => {
    expect(bucketSeries([], '7d')).toEqual([]);
  });

  it('buckets by calendar month for the 12m period', () => {
    // 12m is the one period whose key derivation and stride are both correct.
    const series = bucketSeries(
      graph(['2026-01-15', 100], ['2026-02-02', 50], ['2026-02-20', 25]),
      '12m',
    );

    expect(series).toHaveLength(12);
    expect(series.at(-2)).toEqual({ date: '2026-01', netProfit: 100 });
    expect(series.at(-1)).toEqual({ date: '2026-02', netProfit: 75 });
  });

  it('rounds to cents so float noise never reaches the chart', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in IEEE 754.
    const series = bucketSeries(graph(['2026-01-15', 0.1], ['2026-01-20', 0.2]), '12m');

    expect(series.at(-1)?.netProfit).toBe(0.3);
  });

  it('treats a missing netProfit as zero rather than NaN', () => {
    const series = bucketSeries([{ date: '2026-01-15' } as ChartPoint], '12m');

    expect(series.at(-1)?.netProfit).toBe(0);
  });

  it.fails(`labels every daily point with a real, consecutive date — ${KNOWN_DAILY_BUCKETS}`, () => {
    const series = bucketSeries(graph(['2026-03-01', 10], ['2026-03-02', 20]), '7d');

    expect(series).toHaveLength(7);
    expect(series.slice(-2)).toEqual([
      { date: '2026-03-01', netProfit: 10 },
      { date: '2026-03-02', netProfit: 20 },
    ]);
  });

  it.fails(`zero-fills the days with no orders — ${KNOWN_DAILY_BUCKETS}`, () => {
    // A single day of orders on 2026-03-01 must still produce the six preceding
    // days, at zero, rather than collapsing the series to one point.
    const series = bucketSeries(graph(['2026-03-01', 10]), '7d');

    expect(series).toHaveLength(7);
    expect(series[0]).toEqual({ date: '2026-02-23', netProfit: 0 });
    expect(series.at(-1)).toEqual({ date: '2026-03-01', netProfit: 10 });
  });

  it.fails(`spans 30 consecutive days for the 30d period — ${KNOWN_DAILY_BUCKETS}`, () => {
    // Today the daily stride is 7 days, so `30d` spans roughly 210 days.
    const series = bucketSeries(graph(['2026-03-01', 5]), '30d');

    expect(series).toHaveLength(30);
    expect(series[0]?.date).toBe('2026-01-31');
    expect(series.at(-1)?.date).toBe('2026-03-01');
  });

  it.fails(`sums each ISO week into its Monday — ${KNOWN_DAILY_BUCKETS}`, () => {
    // 2026-03-01 is a Sunday, so it belongs to the week starting 2026-02-23.
    const series = bucketSeries(
      graph(['2026-02-23', 10], ['2026-03-01', 5], ['2026-03-02', 7]),
      '90d',
    );

    expect(series).toHaveLength(13);
    expect(series.at(-2)).toEqual({ date: '2026-02-23', netProfit: 15 });
    expect(series.at(-1)).toEqual({ date: '2026-03-02', netProfit: 7 });
  });

  it.fails(`carries losses through on the daily periods — ${KNOWN_DAILY_BUCKETS}`, () => {
    const series = bucketSeries(graph(['2026-03-02', -42.5]), '7d');

    expect(series.at(-1)).toEqual({ date: '2026-03-02', netProfit: -42.5 });
  });

  it.fails(`anchors the axis to the last day the backend returned — ${KNOWN_DAILY_BUCKETS}`, () => {
    // A response whose newest point is older than today must not be shifted to
    // today, or the chart would claim the shop had a run of zeroes.
    const series = bucketSeries(graph(['2026-01-10', 7]), '7d');

    expect(series.at(-1)?.date).toBe('2026-01-10');
    expect(series[0]?.date).toBe('2026-01-04');
  });
});
