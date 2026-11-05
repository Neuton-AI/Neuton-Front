import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { ConfirmEmailChangePage } from "./ConfirmEmailChangePage";
import { ApiError } from "@/lib/api-error";
const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  clear: vi.fn(),
  methods: vi.fn(),
  auth: {
    loading: false,
    identity: { userId: "person", sessionId: "session" },
    user: { email: "current@example.com" },
    refresh: vi.fn().mockResolvedValue(null),
  },
}));
vi.mock("@/features/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/features/auth/client", () => ({
  authClient: { confirmEmailChange: mocks.confirm, methods: mocks.methods },
}));
vi.mock("@/features/auth/ReauthenticateDialog", () => ({
  ReauthenticateDialog: ({ onVerified }: { onVerified: () => void }) => (
    <button onClick={onVerified}>Synthetic identity proof</button>
  ),
}));
vi.mock("@/features/auth/action-fragment", () => ({
  readActionSecret: () => "a".repeat(43),
  clearActionSecret: mocks.clear,
}));
beforeEach(() => {
  mocks.confirm.mockReset();
  mocks.clear.mockClear();
});
function mount() {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ConfirmEmailChangePage />
    </MemoryRouter>,
  );
}
it("waits for deliberate confirmation and then offers normal sign-in after revocation", async () => {
  mocks.confirm.mockResolvedValue(undefined);
  mount();
  expect(mocks.confirm).not.toHaveBeenCalled();
  await userEvent.click(
    screen.getByRole("button", { name: "Confirm email change" }),
  );
  expect(mocks.confirm).toHaveBeenCalledWith(
    mocks.auth.identity,
    "a".repeat(43),
  );
  expect(await screen.findByRole("status")).toHaveTextContent("Sign in");
  expect(mocks.clear).toHaveBeenCalled();
});
it.each(["ACCOUNT_CHANGED", "EMAIL_UNAVAILABLE", "INVALID_ACTION"])(
  "shows %s without retaining a spent or mismatched secret",
  async (code) => {
    mocks.confirm.mockRejectedValue(new ApiError("Safe failure", 409, code));
    mount();
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm email change" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /account|unavailable|expired/,
    );
    expect(
      screen.queryByRole("button", { name: "Confirm email change" }),
    ).not.toBeInTheDocument();
    expect(mocks.clear).toHaveBeenCalled();
  },
);
it("retains the secret only in the live flow during reauthentication and requires another deliberate confirmation", async () => {
  mocks.confirm
    .mockRejectedValueOnce(
      new ApiError("Verify again", 403, "REAUTHENTICATION_REQUIRED"),
    )
    .mockResolvedValueOnce(undefined);
  mocks.methods.mockResolvedValue({
    passwordAvailable: true,
    googleLinked: false,
    capabilities: { reauthenticateGoogle: false },
  });
  mount();
  await userEvent.click(
    screen.getByRole("button", { name: "Confirm email change" }),
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Synthetic identity proof" }),
  );
  expect(mocks.confirm).toHaveBeenCalledTimes(1);
  expect(mocks.clear).not.toHaveBeenCalled();
  await userEvent.click(
    screen.getByRole("button", { name: "Confirm email change" }),
  );
  expect(mocks.confirm).toHaveBeenCalledTimes(2);
  expect(mocks.confirm).toHaveBeenLastCalledWith(
    mocks.auth.identity,
    "a".repeat(43),
  );
});
