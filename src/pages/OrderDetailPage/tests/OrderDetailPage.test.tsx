import type { OrderDetail, OrderStatus } from "@/features/orders/types";
import { renderWithRouter } from "@/test/render";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A processing order rests in the detail sheet until a human hands it over, so
 * the sheet is the only place that move can happen. These tests pin that the
 * sheet offers the move to every shop member (no owner/admin gate), sends the
 * transition the server accepts, flips to delivered on success, and explains a
 * failed transition inline without losing the button.
 */

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  apiFetch: api.apiFetch,
}));

const state = vi.hoisted(() => ({
  role: "owner" as "owner" | "admin" | "member",
}));

vi.mock("@/features/auth/auth", async () => {
  const { buildShop } = await import("@/test/factories/shops.factory");
  const shop = buildShop();
  return {
    useAuth: () => ({
      session: null,
      loading: false,
      user: { id: "u1" },
      userId: "userId-1",
    }),
    useShopMemberships: () => ({
      memberships: [{ shopId: "shop-1", role: state.role, shops: shop }],
      activeShopId: "shop-1",
      loading: false,
      error: null,
      setActiveShopId: vi.fn(),
      reload: vi.fn(),
    }),
    useCurrentShop: () => shop,
  };
});

const { OrderDetailPage } =
  await import("@/pages/OrderDetailPage/OrderDetailPage");

function makeOrderDetail(status: OrderStatus): OrderDetail {
  return {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    orderNumber: 42,
    shopId: "shop-1",
    userId: "u1",
    customerName: "Maya C.",
    orderDate: "2026-09-28T10:00:00.000Z",
    destinationAddress: "123 Main St",
    deliveryDistanceKm: "5.00",
    deliveryFee: "10.00",
    appliedProfitMargin: "30.00",
    totalCost: "40.00",
    totalAmount: "62.12",
    documentUrl: null,
    status,
    netProfit: 22.12,
    createdAt: "2026-09-28T10:00:00.000Z",
    items: [
      {
        id: "li-1",
        recipeId: "r-1",
        name: "Focaccia",
        quantity: "2.000",
        unitCost: "20.00",
        unitPrice: "31.06",
      },
    ],
  };
}

/** Answers GET /orders/:id from a status the transition mock can move forward. */
function mockApi() {
  const current = { status: "processing" as OrderStatus };

  api.apiFetch.mockImplementation(async (path: string) => {
    if (path.endsWith("/verify")) {
      current.status = "delivered";
      // Like the real PATCH response, the transition carries the order row
      // without its items — the sheet must keep rendering the lines it has.
      const { items: _dropped, ...row } = makeOrderDetail("delivered");
      return { order: row };
    }
    return { order: makeOrderDetail(current.status) };
  });

  return current;
}

beforeEach(() => {
  api.apiFetch.mockReset();
  state.role = "owner";
});

/** The sheet reads `:id` off the route, so it needs a real route to mount on. */
function renderDetail() {
  return renderWithRouter(
    <Routes>
      <Route path="/orders/:id" element={<OrderDetailPage />} />
      <Route path="/orders/:id/edit" element={<h1>Edit order</h1>} />
      <Route path="/orders" element={null} />
    </Routes>,
    { route: "/orders/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
  );
}

describe("OrderDetailPage delivery", () => {
  it("shows the order number, customer, date, and profit metrics", async () => {
    mockApi();
    renderDetail();

    expect(await screen.findByText("Processing")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Maya C." })).toBeInTheDocument();
    expect(screen.getByText("Order #42")).toBeInTheDocument();
    const profit = screen.getByText("Profit").parentElement!;
    expect(within(profit).getByText("$22.12")).toBeInTheDocument();
    expect(within(profit).getByText("36% margin")).toBeInTheDocument();
    expect(screen.queryByText("Distance fee")).not.toBeInTheDocument();
  });

  it("shows the three footer actions in order for a processing order", async () => {
    const user = userEvent.setup();
    mockApi();
    renderDetail();

    await screen.findByRole("button", { name: "Deliver" });
    const footer = screen.getByRole("group", { name: "Order actions" });
    const buttons = within(footer).getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Cancel",
      "Edit",
      "Deliver",
    ]);
    await user.click(within(footer).getByRole("button", { name: "Edit" }));
    expect(await screen.findByRole("heading", { name: "Edit order" })).toBeInTheDocument();
  });

  it("offers the action to members too, not just owners", async () => {
    state.role = "member";
    mockApi();
    renderDetail();

    expect(
      await screen.findByRole("button", { name: "Deliver" }),
    ).toBeInTheDocument();
  });

  it("shows only a disabled Delete button once the order is delivered", async () => {
    const current = mockApi();
    current.status = "delivered";
    renderDetail();

    const button = await screen.findByRole("button", { name: "Delete" });
    const footer = screen.getByRole("group", { name: "Order actions" });
    expect(within(footer).getAllByRole("button")).toEqual([button]);
    expect(button).toBeDisabled();
  });

  it("sends the delivered transition and flips the sheet to delivered", async () => {
    const user = userEvent.setup();
    mockApi();
    renderDetail();

    await user.click(
      await screen.findByRole("button", { name: "Deliver" }),
    );

    await waitFor(() =>
      expect(api.apiFetch).toHaveBeenCalledWith(
        "/orders/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/verify",
        expect.objectContaining({
          method: "POST",
          shopId: "shop-1",
        }),
      ),
    );
    // The sheet hands straight over to the delivered state: badge swapped, the
    // action gone, so the order cannot be delivered twice.
    expect(await screen.findByText("Delivered")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Deliver" }),
    ).toBeNull();
    // The transition response carries no items, so the lines stay from state.
    expect(screen.getByText("Focaccia")).toBeInTheDocument();
  });

  it("keeps the button in place and explains a failed transition", async () => {
    const user = userEvent.setup();
    api.apiFetch.mockImplementation(async (path: string) => {
      if (path.endsWith("/verify")) {
        throw new Error("Order is already delivered");
      }
      return { order: makeOrderDetail("processing") };
    });
    renderDetail();

    await user.click(
      await screen.findByRole("button", { name: "Deliver" }),
    );

    expect(
      await screen.findByText("Order is already delivered"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Deliver" }),
    ).toBeInTheDocument();
  });
});

describe("OrderDetailPage cancellation", () => {
  it("shows the invoice number as the headline handle", async () => {
    api.apiFetch.mockResolvedValue({ order: makeOrderDetail("processing") });
    renderDetail();

    expect(await screen.findByText("Order #42")).toBeInTheDocument();
  });

  it("asks for confirmation in an app dialog before deleting", async () => {
    const user = userEvent.setup();
    api.apiFetch.mockResolvedValue({ order: makeOrderDetail("processing") });
    renderDetail();

    await user.click(
      await screen.findByRole("button", { name: "Cancel" }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Cancel this order?",
    });
    expect(
      within(dialog).getByText(
        "It stays on your records so its number is never reused.",
      ),
    ).toBeInTheDocument();
    // Nothing is sent until the dialog is confirmed.
    expect(api.apiFetch).not.toHaveBeenCalledWith(
      "/orders/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      expect.objectContaining({ method: "DELETE" }),
    );

    await user.click(
      within(dialog).getByRole("button", { name: "Cancel order" }),
    );

    await waitFor(() =>
      expect(api.apiFetch).toHaveBeenCalledWith(
        "/orders/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        expect.objectContaining({ method: "DELETE", shopId: "shop-1" }),
      ),
    );
  });

  it("closes the confirmation without deleting when cancelled", async () => {
    const user = userEvent.setup();
    api.apiFetch.mockResolvedValue({ order: makeOrderDetail("processing") });
    renderDetail();

    await user.click(
      await screen.findByRole("button", { name: "Cancel" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Cancel this order?",
    });

    await user.click(within(dialog).getByRole("button", { name: "Keep order" }));

    expect(
      screen.queryByRole("dialog", { name: "Cancel this order?" }),
    ).toBeNull();
    expect(api.apiFetch).not.toHaveBeenCalledWith(
      "/orders/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("dismisses the confirmation with Escape but keeps the order sheet open", async () => {
    const user = userEvent.setup();
    api.apiFetch.mockResolvedValue({ order: makeOrderDetail("processing") });
    renderDetail();

    await user.click(
      await screen.findByRole("button", { name: "Cancel" }),
    );
    await screen.findByRole("dialog", { name: "Cancel this order?" });

    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("dialog", { name: "Cancel this order?" }),
    ).toBeNull();
    // The Sheet behind it must not also answer the same Escape.
    expect(
      screen.getByRole("dialog", { name: "Order details" }),
    ).toBeInTheDocument();
  });

  it("shows a deleted order as a frozen void with no actions", async () => {
    api.apiFetch.mockResolvedValue({ order: makeOrderDetail("cancelled") });
    renderDetail();

    expect(await screen.findByText("Deleted")).toBeInTheDocument();
    expect(
      screen.getByText(
        /This order was deleted\. It stays on your records so its number is never reused/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Deliver" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });
});

// Keep these screen contracts independent of persistence; sync integration is exercised separately.
vi.mock("@/features/sync/documentsApi", async () => ({
  documentFetch: (await import("@/lib/api")).apiFetch,
}));
