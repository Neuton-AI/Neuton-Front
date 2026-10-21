import { BottomNav } from '@/components/BottomNav/BottomNav';
import { Fab } from '@/components/Fab/Fab';
import { ErrorState, FullPageLoader } from '@/components/feedback';
import { IconStore } from '@/components/icons';
import { Layout } from '@/components/Layout/Layout';
import { StatCard } from '@/components/StatCard/StatCard';
import { InstallAppPopover } from '@/features/pwa/InstallApp';
import type { DashboardPeriod } from '@/features/analytics/types';
import { formatMoney, formatPercent } from '@/lib/format';
import { useDashboardPage } from './DashboardPage.module';
import { ProfitChart } from './ProfitChart/ProfitChart';
const PERIODS: { key: DashboardPeriod; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: '12m', label: '1Y' },
];
export function DashboardPage() {
  const {
    dateLabel,
    profitPerOrder,
    errorMessage,
    authLoading,
    memberships,
    activeShopId,
    shopsLoading,
    shopsError,
    setActiveShopId,
    fabNavigation,
    period,
    setPeriod,
    profitability,
    setProfitability,
    data,
    isLoading,
    error,
    refetch,
    series,
    currency,
    summary,
    trend,
    periodLabel,
    handleSetUpShop,
  } = useDashboardPage();
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
            onClick={handleSetUpShop}
            className="pressable mt-2 rounded-pill bg-brand-primary px-5 py-3 text-label font-medium text-ink-on-primary"
          >
            Set up a shop
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }
  return (
    <Layout
      className="shell bg-[#FAF9F5]"
      mainContent={
        <div className="flex-1 space-y-3 px-4 pb-32">
          <header className="page-header screen-header -mx-4 flex flex-col gap-0.5 px-4">
            <p className="text-[12px] font-medium uppercase leading-[17px] tracking-[1.5px] text-[#CC785C]">
              {dateLabel}
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
          <InstallAppPopover />

          {error ? <ErrorState message={errorMessage} onRetry={() => void refetch()} /> : null}

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
                  {isLoading && !data ? '—' : formatMoney(summary?.netProfit, currency)}
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
              {PERIODS.map(({ key, label }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={period === key}
                  type="button"
                  onClick={() => setPeriod(key)}
                  className={`rounded-full px-3 py-1.5 text-[13px] font-medium leading-[18px] transition-colors duration-200 ${
                    period === key ? 'bg-[#252320] text-[#FAF9F5]' : 'text-[#A09D96]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <div className="flex gap-3">
            <StatCard
              label="Revenue"
              tone="card"
              className="flex-1"
              labelClassName="text-ink-muted opacity-100"
              value={formatMoney(summary?.revenue, currency)}
              sub="Gross income · 30d"
            />
            <StatCard
              label="Expenses"
              tone="card"
              className="flex-1"
              labelClassName="text-ink-muted opacity-100"
              value={formatMoney(summary?.expenses, currency)}
              sub="Operational · 30d"
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
                    {data?.topItem?.name ?? '—'}
                  </p>
                  <p className="text-label font-medium text-ink-on-primary">
                    {data?.topItem
                      ? `${data.topItem.unitsSold} sold · ${periodLabel}`
                      : 'No sales yet'}
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
              }
              value={formatMoney(profitPerOrder, currency)}
              sub={
                <>
                  avg · {data?.orderProfitability.sampleSize ?? 0} orders · {periodLabel}
                </>
              }
            />
          </div>
        </div>
      }
      actions={<Fab {...fabNavigation} />}
      footer={<BottomNav />}
    />
  );
}
