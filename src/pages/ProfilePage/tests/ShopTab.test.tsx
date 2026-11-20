import { buildShop } from "@/test/factories/shops.factory";
import { apiPath } from "@/test/mocks/handlers/context";
import { server } from "@/test/mocks/server";
import { renderWithRouter } from "@/test/render";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { ShopTab } from "../components/ShopTab/ShopTab";

const props = { userId: "userId-1", shopId: "shop-1", role: "owner" as const,
  fallbackName: "testShop", onSaved: vi.fn(), onNotice: vi.fn() };

describe("shop default delivery fee", () => {
  it.each(["owner", "admin"] as const)("lets %s save zero and reload it without changing the legacy rate", async (role) => {
    let shop = buildShop({ deliveryBaseFee: "5.75", deliveryRatePerKm: "99" });
    let payload: unknown;
    server.use(
      http.get(apiPath("/shop"), () => HttpResponse.json({ shop })),
      http.patch(apiPath("/shop"), async ({ request }) => {
        payload = await request.json();
        shop = { ...shop, deliveryBaseFee: String((payload as { deliveryBaseFee: number }).deliveryBaseFee) };
        return HttpResponse.json({ shop });
      }),
    );
    const user = userEvent.setup();
    const view = renderWithRouter(<ShopTab {...props} role={role} />);
    const fee = await screen.findByRole("spinbutton", { name: "Default delivery fee" });
    expect(fee).toHaveValue(5.75);
    expect(screen.queryByText(/per km|rate engine|distance calculations/i)).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Store address" })).toBeInTheDocument();
    await user.clear(fee);
    await user.type(fee, "0");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(payload).toEqual({ storeAddress: null, targetProfitMargin: 30, hourlyLaborCost: 0, deliveryBaseFee: 0 });
    expect(shop.deliveryRatePerKm).toBe("99");
    view.unmount();
    renderWithRouter(<ShopTab {...props} role={role} />);
    expect(await screen.findByRole("spinbutton", { name: "Default delivery fee" })).toHaveValue(0);
  });

  it("preserves cent amounts when submitting the form", async () => {
    let payload: unknown;
    server.use(http.patch(apiPath("/shop"), async ({ request }) => {
      payload = await request.json();
      return HttpResponse.json({ shop: buildShop({ deliveryBaseFee: "5.73" }) });
    }));
    const user = userEvent.setup();
    renderWithRouter(<ShopTab {...props} />);
    const fee = await screen.findByRole("spinbutton", { name: "Default delivery fee" });
    await user.clear(fee);
    await user.type(fee, "5.73");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(payload).toMatchObject({ deliveryBaseFee: 5.73 });
  });

  it("shows members the default without allowing edits", async () => {
    renderWithRouter(<ShopTab {...props} role="member" />);
    expect(await screen.findByRole("spinbutton", { name: "Default delivery fee" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  });
});
