import { resetAuth } from "@/test/auth";
import { renderWithRouter } from "@/test/render";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { OrdersPage } from "../OrdersPage";
vi.mock(
  "@/features/auth/auth",
  async () => (await import("@/test/auth")).authMock,
);
beforeEach(resetAuth);
it("shows the relevant empty state for All and Delivered", async () => {
  const user = userEvent.setup();
  renderWithRouter(<OrdersPage />);
  expect(
    await screen.findByRole("heading", { name: "No orders yet" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "Delivered" }));
  expect(
    await screen.findByRole("heading", { name: "No delivered orders" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Maya/ })).toBeNull();
});

vi.mock("@/features/sync/documentsApi", async () => ({
  documentFetch: (await import("@/lib/api")).apiFetch,
}));
