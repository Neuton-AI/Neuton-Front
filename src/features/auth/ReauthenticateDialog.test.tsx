import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { ReauthenticateDialog } from "./ReauthenticateDialog";
import { authClient } from "./client";
import { broadcastAuthEvent } from "./tab-events";
vi.mock("./tab-events", () => ({ broadcastAuthEvent: vi.fn() }));
const auth = vi.hoisted(() => ({
  identity: { userId: "user-a", environment: "test", sessionId: "old" },
  refresh: vi.fn(),
}));
vi.mock("./useAuth", () => ({ useAuth: () => auth }));
vi.mock("./client", () => ({ authClient: { reauthenticate: vi.fn() } }));
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
function mount() {
  const verified = vi.fn();
  const cancel = vi.fn();
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ReauthenticateDialog
        intent="change your contact email"
        onVerified={verified}
        onCancel={cancel}
      />
    </MemoryRouter>,
  );
  return { verified, cancel };
}
it("keeps the intended action and waits for an authoritative replacement without retaining the password", async () => {
  auth.refresh.mockResolvedValue({
    user: { id: "user-a" },
    session: { id: "new" },
  });
  let finish!: () => void;
  vi.mocked(authClient.reauthenticate).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { verified } = mount();
  const user = userEvent.setup();
  expect(screen.getByRole("dialog")).toHaveTextContent(
    "change your contact email",
  );
  await user.type(
    screen.getByLabelText("Password"),
    "synthetic current password",
  );
  await user.click(screen.getByRole("button", { name: "Verify password" }));
  expect(screen.getByLabelText("Password")).toHaveValue("");
  expect(verified).not.toHaveBeenCalled();
  finish();
  await waitFor(() => expect(verified).toHaveBeenCalledOnce());
  expect(auth.refresh.mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(broadcastAuthEvent).mock.invocationCallOrder[0],
  );
  expect(authClient.reauthenticate).toHaveBeenCalledWith(
    auth.identity,
    "synthetic current password",
  );
});
it("offers normal login when a successful replacement response cannot establish a new session", async () => {
  auth.refresh.mockResolvedValue(null);
  vi.mocked(authClient.reauthenticate).mockResolvedValueOnce();
  const { verified } = mount();
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText("Password"),
    "synthetic current password",
  );
  await user.click(screen.getByRole("button", { name: "Verify password" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Sign in again");
  expect(verified).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Password")).toHaveValue("");
});
