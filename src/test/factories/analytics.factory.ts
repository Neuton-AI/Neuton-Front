import type { DashboardSummary } from '@/features/analytics/types';
export const buildDashboard = (overrides: Partial<DashboardSummary> = {}): DashboardSummary => ({
  period: '30d',
  range: { from: '2026-09-16', to: '2026-10-16' },
  summary: {
    revenue: 20,
    expenses: 5,
    deliveryFees: 2,
    productionCost: 4,
    netProfit: 11,
    orderCount: 2,
    profitMarginPercent: 55,
  },
  trend: { revenuePercent: 10, profitPercent: 10, expensesPercent: 0 },
  graph: [],
  topItem: null,
  orderProfitability: { average: 5.5, median: 4, sampleSize: 2 },
  lowStock: [],
  ...overrides,
});
