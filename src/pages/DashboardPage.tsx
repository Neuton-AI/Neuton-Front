import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { Fab, useFabNavigation } from '../components/Fab';
import { FullPageLoader, ErrorState } from '../components/feedback';
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
    <div className="shell bg-[#FAF9F5]">
      <div className="flex-1 space-y-3 px-4 pb-32 pt-[max(var(--safe-top)+44px,44px)]">
        <header className="flex flex-col gap-0.5 pt-2">
          <p className="text-[12px] font-medium uppercase leading-[17px] tracking-[1.5px] text-[#CC785C]">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            }).replace(',', ' ·')}
          </p>
          <div className="flex items-center justify-between">
            <h1 className="font-['Cormorant_Garamond',serif] text-[36px] leading-[43.6px] tracking-[-0.5px] text-[#141413]">
              Dashboard
            </h1>
            {memberships.length > 1 ? (
              <label className="flex items-center gap-1.5 rounded-full border border-[#E6DFD8] bg-[#FAF9F5] py-1.5 pl-3 pr-2 text-[13px] font-medium text-[#141413]">
                <IconStore className="h-4 w-4 text-[#A09D96]" />
                <span className="sr-only">Active shop</span>
                <select
                  value={activeShopId}
                  onChange={(event) => setActiveShopId(event.target.value)}
                  className="max-w-[7rem] bg-transparent font-medium text-[#141413] outline-none"
                >
                  {memberships.map((row) => (
                    <option key={row.shopId} value={row.shopId}>
                      {row.shops.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </header>

        {error ? (
          <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
        ) : null}

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
                {loading && !data ? '—' : formatMoney(summary?.netProfit, currency)}
              </p>
            </div>
            {trend ? (
              <span className="shrink-0 rounded-full bg-[#5DB8A6] px-2.5 py-1 text-[13px] font-medium leading-[18px] text-[#141413]">
                {trend.profitPercent > 0 ? '+' : ''}
                {formatPercent(trend.profitPercent)}
              </span>
            ) : null}
          </div>

          <div className="h-[104px] w-full">
            <ProfitChart points={series} currency={currency} />
          </div>

          <div role="tablist" aria-label="Period" className="mt-0.5 flex gap-1.5">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                role="tab"
                aria-selected={period === key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`rounded-full px-3 py-1.5 text-[13px] font-medium leading-[18px] transition-colors duration-200 ${
                  period === key
                    ? 'bg-[#252320] text-[#FAF9F5]'
                    : 'text-[#A09D96]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5 rounded-xl bg-[#EFE9DE] p-4">
            <p className="text-[12px] font-medium uppercase leading-[17px] tracking-[1.5px] text-[#6C6A64]">
              Revenue
            </p>
            <p className="font-['Cormorant_Garamond',serif] text-[28px] leading-[34px] tracking-[-0.3px] text-[#141413]">
              {formatMoney(summary?.revenue, currency)}
            </p>
            <p className="text-[13px] font-medium leading-[18px] text-[#6C6A64]">
              Gross income · 30d
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-1.5 rounded-xl bg-[#EFE9DE] p-4">
            <p className="text-[12px] font-medium uppercase leading-[17px] tracking-[1.5px] text-[#6C6A64]">
              Expenses
            </p>
            <p className="font-['Cormorant_Garamond',serif] text-[28px] leading-[34px] tracking-[-0.3px] text-[#141413]">
              {formatMoney(summary?.expenses, currency)}
            </p>
            <p className="text-[13px] font-medium leading-[18px] text-[#6C6A64]">
              Operational · 30d
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col justify-between gap-1.5 rounded-xl bg-[#CC785C] p-4">
            <p className="text-[12px] font-medium uppercase leading-[17px] tracking-[1.5px] text-[#FFFFFF]">
              Top item
            </p>
            <div className="flex flex-col gap-1.5">
              <p className="font-['Cormorant_Garamond',serif] text-[28px] leading-[34px] tracking-[-0.3px] text-[#FFFFFF] line-clamp-2">
                {data?.topItem?.name ?? '—'}
              </p>
              <p className="text-[13px] font-medium leading-[18px] text-[#FFFFFF]">
                {data?.topItem ? `${data.topItem.unitsSold} sold this month` : 'No sales yet'}
              </p>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-1.5 rounded-xl bg-[#EFE9DE] p-4">
            <p className="text-[12px] font-medium uppercase leading-[17px] tracking-[1.5px] text-[#6C6A64]">
              Profit / order
            </p>
            <div className="flex w-fit gap-0.5 rounded-full bg-[#E8E0D2] p-0.5">
              {(['average', 'median'] as const).map((mode) => (
                <button
                  key={mode}
                  role="tab"
                  aria-selected={profitability === mode}
                  type="button"
                  onClick={() => setProfitability(mode)}
                  className={`rounded-full px-2 py-[3px] text-[13px] font-medium leading-[18px] transition-colors duration-200 ${
                    profitability === mode ? 'bg-[#FAF9F5] text-[#141413]' : 'text-[#6C6A64]'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <p className="font-['Cormorant_Garamond',serif] text-[28px] leading-[34px] tracking-[-0.3px] text-[#141413]">
              {formatMoney(
                profitability === 'average'
                  ? data?.orderProfitability.average
                  : data?.orderProfitability.median,
                currency,
              )}
            </p>
            <p className="text-[13px] font-medium leading-[18px] text-[#6C6A64]">
              avg · {data?.orderProfitability.sampleSize ?? 0} orders
            </p>
          </div>
        </div>
      </div>

      <Fab {...fabNavigation} />
      <BottomNav />
    </div>
  );
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