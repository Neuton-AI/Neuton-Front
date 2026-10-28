import { useFabNavigation } from "@/components/Fab/Fab.module";
import { useDashboardSummary } from "@/features/analytics/analyticsApi";
import type { DashboardPeriod } from "@/features/analytics/types";
import { useChartSeries } from "@/features/analytics/usePeriodSeries";
import {
  useAuth,
  useCurrentShop,
  useShopMemberships,
} from "@/features/auth/supabase";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
export const DASHBOARD_PERIODS: { key: DashboardPeriod; label: string }[] = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "12m", label: "1Y" },
];
export function useDashboardPage() {
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

  const [period, setPeriod] = useState<DashboardPeriod>("30d");

  const [profitability, setProfitability] = useState<"average" | "median">(
    "average",
  );

  const { data, isLoading, error, refetch } = useDashboardSummary(
    token,
    activeShopId,
    period,
  );

  const series = useChartSeries(data?.graph ?? [], period);

  const currency = shop?.currency ?? "USD";

  const summary = data?.summary;

  const trend = data?.trend;

  // Period is a trailing window (30d != the calendar month), so captions quote
  // the tab label instead of a calendar phrase like "this month".
  const periodLabel =
    DASHBOARD_PERIODS.find((entry) => entry.key === period)?.label ?? period;
  const handleSetUpShop = () => navigate("/profile");
  const handleRetry = () => {
    void refetch();
  };
  const dateLabel = new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    })
    .replace(",", " ·");
  const profitPerOrder =
    profitability === "average"
      ? data?.orderProfitability.average
      : data?.orderProfitability.median;
  const errorMessage =
    error instanceof Error ? error.message : "Could not load the dashboard.";
  return {
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
    handleRetry,
    series,
    currency,
    summary,
    trend,
    periodLabel,
    handleSetUpShop,
  };
}
export type DashboardPageModel = ReturnType<typeof useDashboardPage>;
