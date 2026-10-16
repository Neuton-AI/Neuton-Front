import type { DashboardPeriod } from '@/features/analytics/types';
import type { ShopId } from '@/lib/queryTypes';
export const analyticsKeys = {
  dashboard: (shopId: ShopId, period: DashboardPeriod) => ['dashboard', shopId, period] as const,
  dashboardRoot: ['dashboard'] as const,
};
