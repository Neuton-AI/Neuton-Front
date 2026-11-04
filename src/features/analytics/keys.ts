import type { DashboardPeriod } from './types';
import type { ShopId, AuthenticatedContext } from '@/lib/queryTypes';
import { identityQueryKey } from '@/features/auth/environment';
export const analyticsKeys = {
  dashboard: (
    identity: AuthenticatedContext,
    shopId: ShopId,
    period: DashboardPeriod,
  ) => identityQueryKey(identity, 'dashboard', shopId, period),
  dashboardRoot: (identity: AuthenticatedContext) =>
    identityQueryKey(identity, 'dashboard'),
};
