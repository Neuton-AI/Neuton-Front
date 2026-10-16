export type DashboardPeriod = '7d' | '30d' | '90d' | '12m';

export type DashboardSummary = {
  period: DashboardPeriod;
  range: { from: string; to: string };
  summary: {
    revenue: number;
    expenses: number;
    deliveryFees: number;
    productionCost: number;
    netProfit: number;
    orderCount: number;
    profitMarginPercent: number;
  };
  trend: {
    revenuePercent: number;
    profitPercent: number;
    expensesPercent: number;
  };
  graph: { date: string; revenue: number; expenses: number; netProfit: number }[];
  topItem: {
    recipeId: string;
    name: string;
    imageUrl: string | null;
    unitsSold: number;
    revenue: number;
    netProfit: number;
  } | null;
  orderProfitability: {
    average: number;
    median: number;
    sampleSize: number;
  };
  lowStock: {
    id: string;
    name: string;
    unit: string;
    currentQuantity: number;
    reorderLevel: number;
  }[];
};
