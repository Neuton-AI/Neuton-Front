import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';
import { renderWithRouter } from '../test/render';
import type { DashboardPeriod, DashboardSummary } from '../lib/api';

/**
 * `usePeriodSeries` is unit-tested on its own, but a correct series is worth
 * nothing if the page never puts it on screen. These tests mount the real
 * DashboardPage against a stubbed `/analytics/dashboard` and read the chart the
 * way a person does — the SVG that ends up on the dashboard.
 *
 * N-26 regression net: `trailingKeys` used to slice the wrong window of the ISO
 * string, so every non-month key was `''` and every bucket fell back to zero.
 * The symptom was a dead flat line on 7D/30D/90D while 1Y still looked right.
 */

const SHOP_ID = 'shop-1';

vi.mock('../lib/supabase', () => ({
  useAuth: () => ({ user: { id: 'u1' }, token: 'test-token', loading: false }),
  useShopMemberships: () => ({
    memberships: [
      {
        shopId: SHOP_ID,
        role: 'owner' as const,
        shops: { id: SHOP_ID, name: 'testShop', currency: 'USD' },
      },
    ],
    activeShopId: SHOP_ID,
    loading: false,
    error: null,
    setActiveShopId: vi.fn(),
  }),
  useCurrentShop: () => ({ id: SHOP_ID, name: 'testShop', currency: 'USD' }),
}));

/** Only the days that had orders, exactly as the backend reports them. */
const GRAPH = [
  { date: '2026-03-01', revenue: 40, expenses: 10, netProfit: 30 },
  { date: '2026-03-02', revenue: 60, expenses: 20, netProfit: 40 },
  { date: '2026-03-03', revenue: 25, expenses: 5, netProfit: 20 },
];

function summary(period: DashboardPeriod, graph: DashboardSummary['graph'] = GRAPH): DashboardSummary {
  return {
    period,
    range: { from: '2026-03-01', to: '2026-03-03' },
    summary: {
      revenue: 125,
      expenses: 35,
      deliveryFees: 0,
      productionCost: 0,
      netProfit: 90,
      orderCount: 3,
      profitMarginPercent: 72,
    },
    trend: { revenuePercent: 12, profitPercent: 8, expensesPercent: -4 },
    graph,
    topItem: {
      recipeId: 'r1',
      name: 'Brownies',
      imageUrl: null,
      unitsSold: 3,
      revenue: 125,
      netProfit: 90,
    },
    orderProfitability: { average: 30, median: 30, sampleSize: 3 },
    lowStock: [],
  };
}

/**
 * The chart is an inline SVG whose line is `M<x> <y>L<x> <y>…`, so the y values
 * sit at the odd indices of the number run. jsdom builds SVG elements as plain
 * `SVGElement`, hence the tag check rather than `instanceof SVGPathElement`.
 */
function plottedHeights(chart: Element): number[] {
  const line = chart.querySelector('path[stroke]');
  if (line === null) throw new Error('profit chart line not rendered');
  const numbers = (line.getAttribute('d') ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  return numbers.filter((_, index) => index % 2 === 1);
}

function stubDashboard(graph: DashboardSummary['graph'] = GRAPH) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const period = (new URL(url).searchParams.get('period') ?? '30d') as DashboardPeriod;
      return { ok: true, status: 200, text: async () => JSON.stringify(summary(period, graph)) };
    }),
  );
}

/** Renders the dashboard and waits for the summary headline to land. */
async function renderDashboard() {
  const view = renderWithRouter(<DashboardPage />);
  await screen.findByText('$125.00');
  return view;
}

/** Clicks a period tab and waits for the chart to re-plot. */
async function showPeriod(tab: '7D' | '30D' | '90D' | '1Y', buckets: number) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('tab', { name: tab }));
  const chart = screen.getByRole('img', { name: /net profit/i });
  await waitFor(() => expect(plottedHeights(chart)).toHaveLength(buckets));
  return chart;
}

beforeEach(() => {
  stubDashboard();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DashboardPage profit chart', () => {
  it.each([
    ['7D', 7],
    ['30D', 30],
    ['90D', 13],
    ['1Y', 12],
  ] as const)('plots one bucket per %s tick', async (tab, buckets) => {
    // Seven slots for a week, thirty for a month, thirteen ISO weeks for a
    // quarter — so a wrong stride surfaces as the wrong number of plotted
    // points instead of as an axis nobody can read.
    await renderDashboard();
    await showPeriod(tab, buckets);
  });

  it.each(['7D', '30D', '90D'] as const)('renders real values on %s, not a dead flat line', async (tab) => {
    // The N-26 symptom: keys that could not match the totals map made every
    // point zero, which collapsed the chart onto one horizontal baseline.
    await renderDashboard();
    const chart = await showPeriod(tab, tab === '7D' ? 7 : tab === '30D' ? 30 : 13);

    expect(new Set(plottedHeights(chart)).size).toBeGreaterThan(1);
  });

  it.each([
    ['7D', '$20.00'],
    ['30D', '$20.00'],
    ['90D', '$60.00'],
    ['1Y', '$90.00'],
  ] as const)('reads %s as ending on its real bucket value', async (tab, latest) => {
    // 7D and 30D bucket by day, so they close on 2026-03-03 = 20. 90D buckets by
    // ISO week, so it closes on the week of Monday the 2nd = 40 + 20 = 60. 1Y
    // closes on March = 30 + 40 + 20 = 90. A bucket that missed the totals map
    // would have reported $0.00 here.
    await renderDashboard();
    await userEvent.setup().click(screen.getByRole('tab', { name: tab }));

    await screen.findByRole('img', { name: `Daily net profit, latest ${latest}` });
  });

  it('keeps the four period tabs wired to the chart', async () => {
    await renderDashboard();

    const tabs = within(screen.getByRole('region', { name: 'Net profit' })).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['7D', '30D', '90D', '1Y']);
  });

  it('falls back to the empty-state copy when the shop had no orders', async () => {
    // An empty graph must still say so, rather than drawing an empty axis that
    // looks like a broken chart.
    stubDashboard([]);
    renderWithRouter(<DashboardPage />);

    expect(await screen.findByText('No orders in this period yet')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /net profit/i })).toBeNull();
  });
});