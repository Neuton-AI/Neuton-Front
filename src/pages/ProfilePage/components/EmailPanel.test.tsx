import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { EmailPanel } from "./EmailPanel";
const mocks = vi.hoisted(() => ({
  change: vi.fn(),
  methods: vi.fn(),
  auth: {
    identity: { userId: "person", sessionId: "session" },
    user: { email: "current@example.com" },
    session: {
      session: { recentAuthenticationExpiresAt: "2999-01-01T00:00:00Z" },
    },
  },
}));
vi.mock("@/features/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/features/auth/client", () => ({
  authClient: { changeEmail: mocks.change, methods: mocks.methods },
}));
vi.mock("@/features/auth/ReauthenticateDialog", () => ({
  ReauthenticateDialog: ({ onVerified }: { onVerified: () => void }) => (
    <button onClick={onVerified}>Synthetic identity proof</button>
  ),
}));
it("keeps the current contact authoritative while a deliberate change awaits email confirmation", async () => {
  mocks.methods.mockResolvedValue({
    passwordAvailable: true,
    capabilities: { reauthenticateGoogle: false },
  });
  mocks.change.mockResolvedValue(undefined);
  render(<EmailPanel />);
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText("New contact email"),
    "new@example.com",
  );
  await user.click(screen.getByRole("button", { name: "Send confirmation" }));
  expect(mocks.change).toHaveBeenCalledWith(
    mocks.auth.identity,
    "new@example.com",
  );
  expect(await screen.findByRole("status")).toHaveTextContent(
    "current address remains",
  );
  expect(screen.getByText("current@example.com")).toBeInTheDocument();
});
it("requires proof before submitting an email change when recent authentication expired", async () => {
  mocks.auth.session.session.recentAuthenticationExpiresAt =
    "2000-01-01T00:00:00Z";
  mocks.change.mockClear();
  mocks.methods.mockResolvedValue({
    passwordAvailable: true,
    capabilities: { reauthenticateGoogle: false },
  });
  render(<EmailPanel />);
  await userEvent.type(
    screen.getByLabelText("New contact email"),
    "next@example.com",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Send confirmation" }),
  );
  expect(
    await screen.findByRole("button", { name: "Synthetic identity proof" }),
  ).toBeInTheDocument();
  expect(mocks.change).not.toHaveBeenCalled();
  mocks.auth.session.session.recentAuthenticationExpiresAt =
    "2999-01-01T00:00:00Z";
});
