import { analyticsKeys } from '@/features/analytics/keys';
import { type DashboardPeriod, type DashboardSummary } from '@/features/analytics/types';
import { apiFetch } from '@/lib/api';
import type { ShopId, UserId } from '@/lib/queryTypes';
import { enabled } from '@/lib/queryTypes';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';

export function useDashboardSummary(
  userId: UserId,
  shopId: ShopId,
  period: DashboardPeriod,
): UseQueryResult<DashboardSummary> {
  return useQuery({
    queryKey: analyticsKeys.dashboard(shopId, period),
    queryFn: ({ signal }) =>
      apiFetch<DashboardSummary>(`/analytics/dashboard?period=${period}`, {
        userId,
        shopId,
        signal,
      }),
    enabled: enabled(userId, shopId),
    // Keep the previous period on screen while the next one loads, so a tab
    // switch never flashes the chart empty.
    placeholderData: keepPreviousData,
  });
}
