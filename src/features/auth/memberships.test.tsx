import { identityPartition } from "./environment";
const selectedKey = `${identityPartition({ environment: "test", userId: "u1" })}:activeShop`;
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./useAuth";
import { authClient } from "./client";
import type { SessionDto } from "./types";
import { ApiError } from "@/lib/api-error";
vi.mock("./client", () => ({ authClient: { session: vi.fn() } }));
function session(shops: string[]): SessionDto {
  return {
    environment: "test",
    user: {
      id: "u1",
      email: "u1@example.com",
      status: "active",
      fullName: null,
      avatarUrl: null,
      emailConfirmedAt: "2026-01-01T00:00:00Z",
    },
    session: {
      id: "s1",
      renewAfter: "2099-01-01",
      idleExpiresAt: "2099-01-01",
      absoluteExpiresAt: "2099-01-02",
      recentAuthenticationExpiresAt: null,
    },
    memberships: shops.map((id) => ({
      shopId: id,
      role: "owner",
      shop: {
        id,
        name: id,
        slug: id,
        currency: "USD",
        timezone: "UTC",
        storeAddress: null,
        targetProfitMargin: "0",
        hourlyLaborCost: "0",
        deliveryBaseFee: "0",
        deliveryRatePerKm: "0",
      },
    })),
  };
}
function fixture() {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  return renderHook(useAuth, { wrapper });
}
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
});
it("replaces stale selection only with a current membership and clears it after removal", async () => {
  localStorage.setItem(selectedKey, "foreign");
  vi.mocked(authClient.session)
    .mockResolvedValueOnce(session(["allowed"]))
    .mockResolvedValueOnce(session([]));
  const { result } = fixture();
  await waitFor(() => expect(result.current.activeShopId).toBe("allowed"));
  expect(localStorage.getItem(selectedKey)).toBe("allowed");
  act(() => result.current.setActiveShopId("foreign"));
  expect(result.current.activeShopId).toBe("allowed");
  await act(() => result.current.refresh());
  expect(localStorage.getItem(selectedKey)).toBeNull();
});
it("retains this environment and user selection without adopting another namespace", async () => {
  localStorage.setItem(selectedKey, "b");
  localStorage.setItem("neuton.activeShop:other:u1", "foreign");
  vi.mocked(authClient.session).mockResolvedValue(session(["a", "b"]));
  const { result } = fixture();
  await waitFor(() => expect(result.current.activeShopId).toBe("b"));
});
it("does not restore cached memberships as authority on a cold offline launch", async () => {
  localStorage.setItem(
    "neuton.memberships:u1",
    JSON.stringify(session(["cached"]).memberships),
  );
  vi.mocked(authClient.session).mockRejectedValue(new ApiError("Offline", 0));
  const { result } = fixture();
  await waitFor(() => expect(result.current.status).toBe("unavailable"));
  expect(result.current.session).toBeNull();
  expect(result.current.activeShopId).toBeNull();
});
