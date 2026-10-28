import { reloadMemberships, resetAuth, selectShop, signOut } from "@/test/auth";
import { buildShop } from "@/test/factories/shops.factory";
import { apiPath } from "@/test/mocks/handlers/context";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/render";
import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProfilePage } from "../ProfilePage.module";
const navigate = vi.hoisted(() => vi.fn());
vi.mock(
  "@/features/auth/supabase",
  async () => (await import("@/test/auth")).authMock,
);
vi.mock("react-router-dom", async (original) => ({
  ...(await original<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));
beforeEach(() => {
  resetAuth();
  navigate.mockReset();
});
describe("useProfilePage", () => {
  it("switches shops and announces the selected shop", () => {
    const { result } = renderHookWithProviders(() => useProfilePage());
    expect(result.current.tab).toBe("me");
    act(() => result.current.handleSelectShop("shop-2", "Bakery"));
    expect(selectShop).toHaveBeenCalledWith("shop-2");
    expect(result.current.notice).toBe("Switched to Bakery.");
  });
  it("creates a trimmed shop, refreshes memberships, and selects it", async () => {
    let body: unknown;
    server.use(
      http.post(apiPath("/shops"), async ({ request }) => {
        body = await request.json();
        expect(request.headers.get("authorization")).toBe("Bearer token-1");
        return HttpResponse.json({
          shop: buildShop({ id: "new-shop", name: "Bakery" }),
        });
      }),
    );
    const { result } = renderHookWithProviders(() => useProfilePage());
    await act(() => result.current.createShop("  Bakery  "));
    expect(body).toEqual({ name: "Bakery" });
    expect(reloadMemberships).toHaveBeenCalledOnce();
    expect(selectShop).toHaveBeenCalledWith("new-shop");
    expect(result.current.notice).toBe("Bakery is ready.");
  });
  it("rejects short names and exposes creation errors without switching shops", async () => {
    server.use(
      http.post(apiPath("/shops"), () =>
        HttpResponse.json(
          { error: { message: "Cannot create" } },
          { status: 500 },
        ),
      ),
    );
    const { result } = renderHookWithProviders(() => useProfilePage());
    await act(() => result.current.createShop("x"));
    expect(result.current.notice).toBeNull();
    await act(() => result.current.createShop("Bakery"));
    expect(result.current.notice).toBe("Cannot create");
    expect(selectShop).not.toHaveBeenCalled();
  });
  it("signs out and returns to authentication", async () => {
    const { result } = renderHookWithProviders(() => useProfilePage());
    await act(() => result.current.signOut());
    expect(signOut).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith("/signin", { replace: true });
  });
  it("surfaces rejected sign-out without navigating", async () => {
    signOut.mockRejectedValue(new Error("Sign-out failed"));
    const { result } = renderHookWithProviders(() => useProfilePage());
    await act(() => result.current.signOut());
    expect(result.current.notice).toBe("Sign-out failed");
    expect(navigate).not.toHaveBeenCalled();
  });
});
