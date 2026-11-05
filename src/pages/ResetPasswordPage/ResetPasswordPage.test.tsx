import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { RecoveryPage } from "../RecoveryPage/RecoveryPage";
import { ResetPasswordPage } from "./ResetPasswordPage";
import { authClient } from "@/features/auth/client";
import { clearActionSecret } from "@/features/auth/action-fragment";

const auth = vi.hoisted(() => ({
  loading: false,
  refresh: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/features/auth", () => ({ useAuth: () => auth }));
vi.mock("@/features/auth/client", () => ({
  authClient: { recover: vi.fn(), resetPassword: vi.fn() },
}));
vi.mock("@/features/auth/action-fragment", () => ({
  readActionSecret: () => "a".repeat(43),
  clearActionSecret: vi.fn(),
}));
it("preserves only the completion message when session revocation remounts the page", () => {
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/auth/reset-password",
          state: { passwordResetCompleted: true },
        },
      ]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ResetPasswordPage />
    </MemoryRouter>,
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "Sign in with your new password",
  );
  expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
});
it("waits for initial session restoration before taking ownership of the action fragment", () => {
  auth.loading = true;
  vi.mocked(clearActionSecret).mockClear();
  const view = render(
    <MemoryRouter>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
  expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  expect(clearActionSecret).not.toHaveBeenCalled();
  auth.loading = false;
  view.rerender(
    <MemoryRouter>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
  expect(screen.getByLabelText("New password")).toBeInTheDocument();
});
it("shows the same accepted recovery message and waits for deliberate reset submission", async () => {
  const user = userEvent.setup();
  vi.mocked(authClient.recover).mockResolvedValue();
  const recovery = render(
    <MemoryRouter>
      <RecoveryPage />
    </MemoryRouter>,
  );
  await user.type(
    screen.getByLabelText("Email address"),
    "account@example.com",
  );
  await user.click(screen.getByRole("button", { name: "Send recovery email" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "If password recovery is available",
  );
  recovery.unmount();
  render(
    <MemoryRouter>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
  expect(authClient.resetPassword).not.toHaveBeenCalled();
  const password = screen.getByLabelText("New password");
  await user.type(password, "a replacement synthetic password");
  await user.type(
    screen.getByLabelText("Confirm new password"),
    "a replacement synthetic password",
  );
  await user.click(screen.getByRole("button", { name: "Reset password" }));
  expect(authClient.resetPassword).toHaveBeenCalledWith(
    "a".repeat(43),
    "a replacement synthetic password",
  );
  expect(await screen.findByRole("status")).toHaveTextContent("Sign in");
  expect(clearActionSecret).toHaveBeenCalled();
  expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/signin",
  );
});
it("clears submitted secrets after an expired or uncertain reset and offers a restart", async () => {
  vi.mocked(authClient.resetPassword).mockRejectedValueOnce(
    new Error("This link is invalid or has expired"),
  );
  render(
    <MemoryRouter>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText("New password"),
    "a replacement synthetic password",
  );
  await user.type(
    screen.getByLabelText("Confirm new password"),
    "a replacement synthetic password",
  );
  await user.click(screen.getByRole("button", { name: "Reset password" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("expired");
  expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Request a new link" }),
  ).toHaveAttribute("href", "/forgot-password");
});
