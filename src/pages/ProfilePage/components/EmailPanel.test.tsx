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
