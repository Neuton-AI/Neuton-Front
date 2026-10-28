import { resetAuth } from "@/test/auth";
import { renderHookWithProviders } from "@/test/render";
import { act, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useDashboardPage } from "../DashboardPage.module";
vi.mock(
  "@/features/auth/supabase",
  async () => (await import("@/test/auth")).authMock,
);
beforeEach(resetAuth);
it("loads analytics and switches derived profitability without another view calculation", async () => {
  const { result } = renderHookWithProviders(() => useDashboardPage());
  await waitFor(() => expect(result.current.summary?.netProfit).toBe(11));
  expect(result.current.profitPerOrder).toBe(5.5);
  act(() => result.current.setProfitability("median"));
  expect(result.current.profitPerOrder).toBe(4);
  act(() => result.current.setPeriod("7d"));
  expect(result.current.periodLabel).toBe("7D");
});
