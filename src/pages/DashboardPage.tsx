import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { Fab, useFabNavigation } from '../components/Fab';
import { FullPageLoader, ErrorState } from '../components/feedback';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { IconStore } from '../components/icons';
import { apiFetch, type DashboardPeriod, type DashboardSummary } from '../lib/api';
import { formatMoney, formatPercent, toNumber } from '../lib/format';
import { useAuth, useCurrentShop, useShopMemberships } from '../lib/supabase';
import { useChartSeries, type ChartPoint } from '../lib/usePeriodSeries';

const PERIODS: { key: DashboardPeriod; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: '12m', label: '1Y' },
];

export function DashboardPage() {
  const { user, token, loading: authLoading } = useAuth();
  const {
    memberships,
    activeShopId,
    loading: shopsLoading,
    error: shopsError,
    setActiveShopId,
  } = useShopMemberships(user?.id);
  const shop = useCurrentShop(memberships, activeShopId);
  const fabNavigation = useFabNavigation();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<DashboardPeriod>('30d');
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profitability, setProfitability] = useState<'average' | 'median'>('average');

  const [reloadKey, setReloadKey] = useState(0);

  const series = useChartSeries(data?.graph ?? [], period);

  useEffect(() => {
    if (!token || !activeShopId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    apiFetch<DashboardSummary>(`/analytics/dashboard?period=${period}`, {
      token,
      shopId: activeShopId,
      signal: controller.signal,
    })
      .then(setData)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Could not load your dashboard');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [token, activeShopId, period, reloadKey]);

  if (authLoading || shopsLoading) return <FullPageLoader label="Opening shop" />;
  if (shopsError) return <ErrorState message={shopsError} />;

  if (!activeShopId) {
    return (
      <div className="shell">
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <h1 className="font-display text-title text-ink">No shop yet</h1>
          <p className="max-w-[34ch] text-body text-ink-muted">
            Create a shop to start tracking ingredient costs, menu pricing and real profit.
          </p>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="pressable mt-2 rounded-pill bg-brand-primary px-5 py-3 text-label font-medium text-ink-on-primary"
          >
            Set up a shop
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const currency = shop?.currency ?? 'USD';
  const summary = data?.summary;
  const trend = data?.trend;

  return (
    <div className="shell">
      <div className="flex-1 space-y-3 px-4 pb-32 pt-[max(var(--safe-top)+44px,44px)]">
        <PageHeader
          eyebrow={new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
          title="Dashboard"
          action={
            memberships.length > 1 ? (
              <label className="flex items-center gap-1.5 rounded-pill border border-hairline bg-surface-canvas py-1.5 pl-3 pr-2 text-label">
                <IconStore className="h-4 w-4 text-ink-muted" />
                <span className="sr-only">Active shop</span>
                <select
                  value={activeShopId}
                  onChange={(event) => setActiveShopId(event.target.value)}
                  className="max-w-[7rem] bg-transparent font-medium text-ink outline-none"
                >
                  {memberships.map((row) => (
                    <option key={row.shopId} value={row.shopId}>
                      {row.shops.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null
          }
        />

        {error ? (
          <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
        ) : null}

        <section
          aria-label="Net profit"
          className="flex flex-col gap-2.5 overflow-hidden rounded-card bg-surface-dark p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-eyebrow font-medium uppercase text-ink-on-dark-soft">
                Net profit
              </p>
              <p className="truncate font-display text-title text-ink-on-dark">
                {loading && !data ? '—' : formatMoney(summary?.netProfit, currency)}
              </p>
            </div>
            {trend ? (
              <span className="mt-1 shrink-0 rounded-pill bg-brand-teal px-2.5 py-1 text-label font-medium text-ink">
                {trend.profitPercent >= 0 ? '+' : '−'}
                {formatPercent(Math.abs(trend.profitPercent))}
              </span>
            ) : null}
          </div>

          <div className="h-[104px] w-full">
            <ProfitChart points={series} currency={currency} />
          </div>

          <div role="tablist" aria-label="Period" className="flex gap-1.5">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                role="tab"
                aria-selected={period === key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`rounded-pill px-3 py-1.5 text-label font-medium transition-colors duration-200 ${
                  period === key
                    ? 'bg-surface-dark-elevated text-ink-on-dark'
                    : 'text-ink-on-dark-soft'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Revenue"
            value={formatMoney(summary?.revenue, currency)}
            sub={
              trend ? (
                <span className={trendTone(trend.revenuePercent)}>
                  {formatPercent(trend.revenuePercent)} vs prev
                </span>
              ) : (
                'Gross income'
              )
            }
          />
          <StatCard
            label="Expenses"
            value={formatMoney(summary?.expenses, currency)}
            sub={
              trend ? (
                <span className={trendTone(-trend.expensesPercent)}>
                  {formatPercent(trend.expensesPercent)} vs prev
                </span>
              ) : (
                'Recorded receipts'
              )
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Top seller"
            value={data?.topItem?.name ?? '—'}
            sub={
              data?.topItem ? `${data.topItem.unitsSold} sold · ${formatMoney(data.topItem.revenue, currency)}` : 'No sales yet'
            }
            tone="primary"
          />
          <StatCard
            label="Profit / order"
            value={formatMoney(
              profitability === 'average'
                ? data?.orderProfitability.average
                : data?.orderProfitability.median,
              currency,
            )}
            sub={`${profitability} · ${data?.orderProfitability.sampleSize ?? 0} orders`}
            middle={
              <span
                role="tablist"
                aria-label="Statistic"
                className="flex w-fit gap-0.5 rounded-pill bg-surface-cream-strong p-0.5"
              >
                {(['average', 'median'] as const).map((mode) => (
                  <button
                    key={mode}
                    role="tab"
                    aria-selected={profitability === mode}
                    type="button"
                    onClick={() => setProfitability(mode)}
                    className={`rounded-pill px-2 py-0.5 text-label font-medium transition-colors duration-200 ${
                      profitability === mode ? 'bg-surface-canvas text-ink' : 'text-ink-muted'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </span>
            }
          />
        </div>

        {summary && summary.orderCount === 0 ? (
          <p className="pb-2 text-center text-label text-ink-muted-soft">
            No orders in this period yet.
          </p>
        ) : summary ? (
          <p className="pb-2 text-center text-label text-ink-muted-soft">
            {summary.orderCount} {summary.orderCount === 1 ? 'order' : 'orders'} ·{' '}
            {formatMoney(summary.deliveryFees, currency)} delivery fees
          </p>
        ) : null}
      </div>

      <Fab {...fabNavigation} />
      <BottomNav />
    </div>
  );
}

function trendTone(percent: number): string {
  if (percent > 0) return 'text-semantic-success';
  if (percent < 0) return 'text-semantic-error';
  return 'text-ink-muted-soft';
}

/**
 * Sparse daily series as an inline area + line. The backend returns one point per
 * day with orders only, so gaps are filled client-side; a chart library would be
 * more weight than this view needs.
 */
function ProfitChart({ points, currency }: { points: ChartPoint[]; currency: string }) {
  const W = 326;
  const H = 94;
  const PAD = 6;

  if (points.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-label text-ink-on-dark-soft">No orders in this period yet</p>
      </div>
    );
  }

  const values = points.map((point) => toNumber(point.netProfit));
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;

  const x = (index: number) => PAD + (index / (points.length - 1)) * (W - PAD * 2);
  const y = (value: number) => H - PAD - ((value - min) / span) * (H - PAD * 2);

  const line = points
    .map(
      (_point, index) =>
        `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)} ${y(values[index]!).toFixed(1)}`,
    )
    .join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z`;
  const lastIndex = points.length - 1;

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
      <circle cx={x(lastIndex)} cy={y(values[lastIndex]!)} r={4} fill="#E8A55A" />
    </svg>
  );
}