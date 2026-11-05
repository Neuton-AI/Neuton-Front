import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { SessionsPanel } from "./SessionsPanel";
import { authClient } from "@/features/auth/client";

const auth = vi.hoisted(() => ({
  identity: { userId: "user-a", environment: "test" },
  logout: vi.fn(),
  logoutAll: vi.fn(),
}));
vi.mock("@/features/auth", () => ({ useAuth: () => auth }));
vi.mock("@/features/auth/client", () => ({
  authClient: { devices: vi.fn(), revokeDevice: vi.fn() },
}));
it("shows devices and retains the list when a device revocation is not confirmed", async () => {
  vi.mocked(authClient.devices).mockResolvedValue({
    sessions: [
      {
        id: "current",
        device: "Current browser",
        current: true,
        createdAt: "2026-11-01T00:00:00Z",
        lastActivityAt: "2026-11-05T00:00:00Z",
        idleExpiresAt: "2026-11-12T00:00:00Z",
        absoluteExpiresAt: "2026-12-01T00:00:00Z",
      },
      {
        id: "other",
        device: "Other browser",
        current: false,
        createdAt: "2026-11-01T00:00:00Z",
        lastActivityAt: "2026-11-04T00:00:00Z",
        idleExpiresAt: "2026-11-11T00:00:00Z",
        absoluteExpiresAt: "2026-12-01T00:00:00Z",
      },
    ],
  });
  vi.mocked(authClient.revokeDevice).mockRejectedValueOnce(
    new Error("Unavailable"),
  );
  render(<SessionsPanel />);
  await screen.findByText("This device");
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "Sign out Other browser" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("not confirmed");
  expect(screen.getByText("Other browser")).toBeInTheDocument();
  vi.mocked(authClient.revokeDevice).mockResolvedValueOnce();
  await user.click(
    screen.getByRole("button", { name: "Sign out Other browser" }),
  );
  await waitFor(() =>
    expect(screen.queryByText("Other browser")).not.toBeInTheDocument(),
  );
  await user.click(
    screen.getByRole("button", { name: "Sign out all devices" }),
  );
  expect(auth.logoutAll).toHaveBeenCalledOnce();
});
