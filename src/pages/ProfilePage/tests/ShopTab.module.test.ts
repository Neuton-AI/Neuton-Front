import { buildShop } from "@/test/factories/shops.factory";
import { apiPath } from "@/test/mocks/handlers/context";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/render";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { FormEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useShopTab } from "../components/ShopTab/ShopTab.module";

const onSaved = vi.fn();
const onNotice = vi.fn();
const props = {
  token: "token-1",
  shopId: "shop-1",
  role: "owner" as const,
  fallbackName: "testShop",
  onSaved,
  onNotice,
};
const event = { preventDefault: vi.fn() } as unknown as FormEvent;
beforeEach(() => {
  onSaved.mockReset();
  onNotice.mockReset();
});
describe("useShopTab", () => {
  it("hydrates settings, converts numeric inputs, and saves a normalized payload", async () => {
    let body: unknown;
    server.use(
      http.patch(apiPath("/shop"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ shop: buildShop() });
      }),
    );
    const { result } = renderHookWithProviders(() => useShopTab(props));
    expect(result.current.shopQueryIsLoading).toBe(true);
    await waitFor(() =>
      expect(result.current.formValues.targetProfitMargin).toBe("30"),
    );
    act(() => {
      result.current.handleFieldChange("storeAddress", "  Market Street  ");
      result.current.handleFieldChange("deliveryBaseFee", "2.50");
    });
    await act(() => result.current.save(event));
    expect(body).toEqual({
      storeAddress: "Market Street",
      targetProfitMargin: 30,
      hourlyLaborCost: 0,
      deliveryBaseFee: 2.5,
      deliveryRatePerKm: 0,
    });
    expect(onSaved).toHaveBeenCalledOnce();
  });
  it("preserves edits across a same-shop refetch", async () => {
    const { result } = renderHookWithProviders(() => useShopTab(props));
    await waitFor(() =>
      expect(result.current.formValues.targetProfitMargin).toBe("30"),
    );
    act(() => result.current.handleFieldChange("targetProfitMargin", "45"));
    server.use(
      http.get(apiPath("/shop"), () =>
        HttpResponse.json({ shop: buildShop({ targetProfitMargin: "50" }) }),
      ),
    );
    await act(async () => result.current.handleRetry());
    await waitFor(() =>
      expect(result.current.shop?.targetProfitMargin).toBe("50"),
    );
    expect(result.current.formValues.targetProfitMargin).toBe("45");
  });
  it("prevents member writes even when save is called directly", async () => {
    const { result } = renderHookWithProviders(() =>
      useShopTab({ ...props, role: "member" }),
    );
    await waitFor(() => expect(result.current.shop).not.toBeNull());
    expect(result.current.canEdit).toBe(false);
    await act(() => result.current.save(event));
    expect(onSaved).not.toHaveBeenCalled();
    expect(onNotice).not.toHaveBeenCalled();
  });
  it("reports fetch and save failures and permits retry", async () => {
    server.use(
      http.get(apiPath("/shop"), () =>
        HttpResponse.json(
          { error: { message: "Settings unavailable" } },
          { status: 500 },
        ),
      ),
    );
    const { result } = renderHookWithProviders(() => useShopTab(props));
    await waitFor(() =>
      expect(result.current.errorMessage).toBe("Settings unavailable"),
    );
    server.resetHandlers();
    act(() => result.current.handleRetry());
    await waitFor(() =>
      expect(result.current.formValues.targetProfitMargin).toBe("30"),
    );
    server.use(
      http.patch(apiPath("/shop"), () =>
        HttpResponse.json(
          { error: { message: "Save rejected" } },
          { status: 403 },
        ),
      ),
    );
    await act(() => result.current.save(event));
    expect(onNotice).toHaveBeenCalledWith("Save rejected");
    expect(onSaved).not.toHaveBeenCalled();
    expect(result.current.updateShopPending).toBe(false);
  });
  it("rejects invalid settings before an HTTP write", async () => {
    const { result } = renderHookWithProviders(() => useShopTab(props));
    await waitFor(() =>
      expect(result.current.formValues.targetProfitMargin).toBe("30"),
    );
    act(() => result.current.handleFieldChange("targetProfitMargin", "-1"));
    await act(() => result.current.save(event));
    expect(onNotice).toHaveBeenCalledWith(
      "Target profit margin is outside the allowed range.",
    );
  });
  it("leaves settings queries idle without a shop", () => {
    const { result } = renderHookWithProviders(() =>
      useShopTab({ ...props, shopId: null }),
    );
    expect(result.current.shop).toBeNull();
    expect(result.current.shopQueryIsLoading).toBe(false);
  });
});
