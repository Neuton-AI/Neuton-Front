import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderWithRouter } from "@/test/render";
import { ConfirmEmailPage } from "./ConfirmEmailPage";
const boundary = vi.hoisted(() => ({
  confirm: vi.fn(),
  resend: vi.fn(),
  refresh: vi.fn(),
  clear: vi.fn(),
}));
vi.mock("@/features/auth", () => ({
  useAuth: () => ({ user: null, refresh: boundary.refresh, logout: vi.fn() }),
}));
vi.mock("@/features/auth/client", () => ({
  authClient: { confirm: boundary.confirm, resend: boundary.resend },
}));
vi.mock("@/features/auth/action-fragment", () => ({
  readActionSecret: () => "A".repeat(43),
  clearActionSecret: boundary.clear,
}));
beforeEach(() => {
  vi.resetAllMocks();
  boundary.refresh.mockResolvedValue(null);
});
it("does not consume an opened link until the user deliberately confirms", async () => {
  renderWithRouter(<ConfirmEmailPage />, { route: "/auth/confirm" });
  expect(boundary.confirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm email" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Sign in to continue",
  );
  expect(boundary.confirm).toHaveBeenCalledOnce();
  expect(boundary.clear).toHaveBeenCalled();
  expect(boundary.refresh).toHaveBeenCalledOnce();
  expect(screen.queryByRole("button", { name: "Confirm email" })).toBeNull();
});
it("keeps resend recovery available after an expired or used link", async () => {
  boundary.confirm.mockRejectedValue(
    new Error("This confirmation link has expired or was already used."),
  );
  renderWithRouter(<ConfirmEmailPage />, { route: "/auth/confirm" });
  fireEvent.click(screen.getByRole("button", { name: "Confirm email" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("expired");
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "pending@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Resend confirmation" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "If confirmation is available",
  );
  expect(boundary.resend).toHaveBeenCalledWith("pending@example.com");
});
