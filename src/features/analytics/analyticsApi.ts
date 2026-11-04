import { sameQueryPartition } from '@/features/auth/environment';
import { analyticsKeys } from '@/features/analytics/keys';
import {
  type DashboardPeriod,
  type DashboardSummary,
} from '@/features/analytics/types';
import { apiFetch } from '@/lib/api';
import type { ShopId, AuthenticatedContext } from '@/lib/queryTypes';
import { networkEnabled } from '@/lib/queryTypes';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export function useDashboardSummary(
  identity: AuthenticatedContext,
  shopId: ShopId,
  period: DashboardPeriod,
): UseQueryResult<DashboardSummary> {
  return useQuery({
    networkMode: 'always',
    queryKey: analyticsKeys.dashboard(identity, shopId, period),
    queryFn: ({ signal }) =>
      apiFetch<DashboardSummary>(`/analytics/dashboard?period=${period}`, {
        identity,
        shopId,
        signal,
      }),
    enabled: networkEnabled(identity, shopId),
    // Keep the previous period on screen while the next one loads, so a tab
    // switch never flashes the chart empty.
    placeholderData: (previous, query) =>
      sameQueryPartition(query?.queryKey, identity, shopId)
        ? previous
        : undefined,
  });
}
