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
 * `bucketSeries` was broken twice over on the daily periods, in
 * usePeriodSeries.ts `trailingKeys`:
 *
 *  1. It sliced `iso.slice(step === 'month' ? 0 : 10, step === 'month' ? 7 : 10)`.
 *     For any non-month period that is `slice(10, 10)` — the empty string. The
 *     intent was `slice(0, 10)`. Every generated key became `''`, which can
 *     never hit the `totals` map, so 7d, 30d and 90d plotted all zeroes.
 *  2. It stepped `cursor.setUTCDate(cursor.getUTCDate() - back * 7)` — a
 *     hardcoded *weekly* stride, applied even when `step` is `'day'`. So the
 *     daily periods walked back in 7-day jumps regardless.
 *
 * Combined effect: every non-month period plotted all zeroes, because no
 * generated key could ever match the map the totals were summed into. On top of
 * that, 7d spanned 42 days and 30d spanned 210 instead of 7 and 30. 90d wanted a
 * weekly stride, so only defect 1 hit it; 12m wanted neither, which is why the
 * monthly chart looked plausible and hid the bug. The tests below are the
 * regression net for both defects — they must stay real assertions, never
 * `it.fails`.
 */
const PERIOD_AXIS =
  'the trailing axis must be labelled with the same stride the data was bucketed at';

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

  it(`labels every daily point with a real, consecutive date — ${PERIOD_AXIS}`, () => {
    const series = bucketSeries(graph(['2026-03-01', 10], ['2026-03-02', 20]), '7d');

    expect(series).toHaveLength(7);
    expect(series.slice(-2)).toEqual([
      { date: '2026-03-01', netProfit: 10 },
      { date: '2026-03-02', netProfit: 20 },
    ]);
  });

  it(`zero-fills the days with no orders — ${PERIOD_AXIS}`, () => {
    // A single day of orders on 2026-03-01 must still produce the six preceding
    // days, at zero, rather than collapsing the series to one point.
    const series = bucketSeries(graph(['2026-03-01', 10]), '7d');

    expect(series).toHaveLength(7);
    expect(series[0]).toEqual({ date: '2026-02-23', netProfit: 0 });
    expect(series.at(-1)).toEqual({ date: '2026-03-01', netProfit: 10 });
  });

  it(`spans 30 consecutive days for the 30d period — ${PERIOD_AXIS}`, () => {
    // The daily stride used to be 7 days, so `30d` spanned roughly 210 days.
    const series = bucketSeries(graph(['2026-03-01', 5]), '30d');

    expect(series).toHaveLength(30);
    expect(series[0]?.date).toBe('2026-01-31');
    expect(series.at(-1)?.date).toBe('2026-03-01');
  });

  it(`sums each ISO week into its Monday — ${PERIOD_AXIS}`, () => {
    // 2026-03-01 is a Sunday, so it belongs to the week starting 2026-02-23.
    const series = bucketSeries(
      graph(['2026-02-23', 10], ['2026-03-01', 5], ['2026-03-02', 7]),
      '90d',
    );

    expect(series).toHaveLength(13);
    expect(series.at(-2)).toEqual({ date: '2026-02-23', netProfit: 15 });
    expect(series.at(-1)).toEqual({ date: '2026-03-02', netProfit: 7 });
  });

  it(`carries losses through on the daily periods — ${PERIOD_AXIS}`, () => {
    const series = bucketSeries(graph(['2026-03-02', -42.5]), '7d');

    expect(series.at(-1)).toEqual({ date: '2026-03-02', netProfit: -42.5 });
  });

  it(`anchors the axis to the last day the backend returned — ${PERIOD_AXIS}`, () => {
    // A response whose newest point is older than today must not be shifted to
    // today, or the chart would claim the shop had a run of zeroes.
    const series = bucketSeries(graph(['2026-01-10', 7]), '7d');

    expect(series.at(-1)?.date).toBe('2026-01-10');
    expect(series[0]?.date).toBe('2026-01-04');
  });
});
