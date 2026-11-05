import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { PasswordPanel } from "./PasswordPanel";
import { authClient } from "@/features/auth/client";

const auth = vi.hoisted(() => ({
  identity: { userId: "user-a", environment: "test", sessionId: "old" },
  refresh: vi.fn(),
}));
vi.mock("@/features/auth", () => ({ useAuth: () => auth }));
vi.mock("@/features/auth/client", () => ({
  authClient: { changePassword: vi.fn(), reauthenticate: vi.fn() },
}));

it("clears password fields and reloads authoritative identity after changing credentials", async () => {
  auth.refresh.mockResolvedValue({
    user: { id: "user-a" },
    session: { id: "new" },
  });
  vi.mocked(authClient.changePassword).mockResolvedValue();
  render(
    <MemoryRouter>
      <PasswordPanel />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText("Current password"),
    "old synthetic password",
  );
  await user.type(
    screen.getByLabelText("New password"),
    "new synthetic password",
  );
  await user.click(screen.getByRole("button", { name: "Change password" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Password changed",
  );
  expect(authClient.changePassword).toHaveBeenCalledWith(
    auth.identity,
    "old synthetic password",
    "new synthetic password",
  );
  expect(auth.refresh).toHaveBeenCalled();
  expect(screen.getByLabelText("Current password")).toHaveValue("");
  expect(screen.getByLabelText("New password")).toHaveValue("");
});

it("rechecks the session after an uncertain replacement without replaying the change", async () => {
  auth.refresh.mockResolvedValue(null);
  vi.mocked(authClient.changePassword).mockRejectedValueOnce(
    new Error("Connection lost"),
  );
  render(
    <MemoryRouter>
      <PasswordPanel />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText("Current password"),
    "old synthetic password",
  );
  await user.type(
    screen.getByLabelText("New password"),
    "new synthetic password",
  );
  await user.click(screen.getByRole("button", { name: "Change password" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("not confirmed");
  expect(screen.getByRole("link", { name: "Sign in again" })).toHaveAttribute(
    "href",
    "/signin",
  );
  expect(screen.getByLabelText("Current password")).toHaveValue("");
});
