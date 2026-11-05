import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { MethodsPanel } from "./MethodsPanel";
const mocks = vi.hoisted(() => ({
  methods: vi.fn(),
  add: vi.fn(),
  unlink: vi.fn(),
  replace: vi.fn(),
  auth: {
    identity: { userId: "person", sessionId: "session", environment: "test" },
    refresh: vi.fn(),
  },
}));
vi.mock("@/features/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/features/auth/client", () => ({
  authClient: {
    methods: mocks.methods,
    addPassword: mocks.add,
    unlinkGoogle: mocks.unlink,
  },
}));
vi.mock("@/features/auth/replace-browser-session", () => ({
  replaceBrowserSession: mocks.replace,
}));
vi.mock("./PasswordPanel", () => ({
  PasswordPanel: () => <p>Existing password controls</p>,
}));
beforeEach(() => {
  mocks.methods.mockReset();
  mocks.replace.mockImplementation(async (_auth, operation) => operation());
});
function mount() {
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <MethodsPanel />
    </MemoryRouter>,
  );
}
it("explains the last-method rule and requires Google proof before showing a first-password form", async () => {
  mocks.methods.mockResolvedValue({
    passwordAvailable: false,
    googleLinked: true,
    capabilities: {
      linkGoogle: false,
      unlinkGoogle: false,
      addPassword: false,
      reauthenticateGoogle: true,
    },
  });
  mount();
  expect(await screen.findByText("Google linked")).toBeInTheDocument();
  expect(
    screen.getByText(/Add a password before removing Google/),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText("First password")).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Verify identity" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("Existing password controls"),
  ).not.toBeInTheDocument();
});
it("submits a first password only from the server capability and clears it after replacement", async () => {
  mocks.methods.mockResolvedValue({
    passwordAvailable: false,
    googleLinked: true,
    capabilities: {
      linkGoogle: false,
      unlinkGoogle: false,
      addPassword: true,
      reauthenticateGoogle: true,
    },
  });
  mocks.add.mockResolvedValue(undefined);
  mount();
  const input = await screen.findByLabelText("First password");
  const user = userEvent.setup();
  await user.type(input, "a synthetic first password");
  await user.click(screen.getByRole("button", { name: "Add password" }));
  expect(mocks.add).toHaveBeenCalledWith(
    mocks.auth.identity,
    "a synthetic first password",
  );
  expect(input).toHaveValue("");
  expect(await screen.findByRole("status")).toHaveTextContent("Password added");
});
it("does not expose method-changing controls when methods cannot be loaded", async () => {
  mocks.methods.mockRejectedValue(new Error("offline"));
  mount();
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load");
  expect(
    screen.queryByRole("button", { name: "Link Google" }),
  ).not.toBeInTheDocument();
});
