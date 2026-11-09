import { renderWithRouter } from "@/test/render";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * AuthPage owns one behaviour that nothing else in the app can cover: after a
 * successful sign-in it must return the user to wherever RequireAuth bounced
 * them from. That round trip is why the guard stores `state.from`, so the two
 * halves are pinned here against mocked authentication actions.
 */

const auth = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  googleSignInAvailable: vi.fn(),
  startGoogleSignIn: vi.fn(),
}));

vi.mock("@/features/auth/auth", () => ({
  ...auth,
  useAuth: () => ({ session: null, loading: false }),
}));

const { AuthPage } = await import("@/pages/AuthPage/AuthPage");

const WhereAmI = () => {
  const { pathname } = useLocation();
  return <output data-testid="where">{pathname}</output>;
};

/** Renders AuthPage together with a probe of the current route. */
function renderAuth(route: string, mode: "signin" | "signup" = "signin") {
  return renderWithRouter(
    <>
      <AuthPage mode={mode} />
      <WhereAmI />
    </>,
    { route },
  );
}

beforeEach(() => {
  auth.signIn.mockReset();
  auth.signUp.mockReset();
  auth.signIn.mockResolvedValue(undefined);
  auth.signUp.mockResolvedValue(undefined);
  auth.googleSignInAvailable.mockReset().mockResolvedValue(false);
  auth.startGoogleSignIn.mockReset().mockResolvedValue(undefined);
});

describe("AuthPage sign in", () => {
  it("labels both fields and requires them", () => {
    renderAuth("/signin");

    const email = screen.getByLabelText("Email");
    const password = screen.getByLabelText("Password");

    expect(email).toBeRequired();
    expect(email).toHaveAttribute("type", "email");
    // current-password, not new-password: the password manager must offer to
    // fill an existing credential instead of generating one.
    expect(password).toHaveAttribute("autocomplete", "current-password");
    expect(password).toHaveAttribute("maxlength", "128");
  });

  it("submits the typed credentials to Neuton", async () => {
    const user = userEvent.setup();
    renderAuth("/signin");

    await user.type(screen.getByLabelText("Email"), "testtest@gmail.com");
    await user.type(screen.getByLabelText("Password"), "test-test-test-pass");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(auth.signIn).toHaveBeenCalledWith({
        email: "testtest@gmail.com",
        password: "test-test-test-pass",
      }),
    );
  });

  it("surfaces a rejected sign-in as an alert and stays put", async () => {
    const user = userEvent.setup();
    auth.signIn.mockRejectedValue(new Error("Invalid login credentials"));
    renderAuth("/signin");

    await user.type(screen.getByLabelText("Email"), "testtest@gmail.com");
    await user.type(screen.getByLabelText("Password"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid login credentials",
    );
    expect(screen.getByTestId("where")).toHaveTextContent("/signin");
  });

  it("disables the submit button while the request is in flight", async () => {
    const user = userEvent.setup();
    let release: (() => void) | undefined;
    auth.signIn.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve(undefined);
      }),
    );
    renderAuth("/signin");

    await user.type(screen.getByLabelText("Email"), "testtest@gmail.com");
    await user.type(screen.getByLabelText("Password"), "test-test-test-pass");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    // Without this, a double-tap fires two sign-in requests.
    expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled();

    release?.();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Working…" })).toBeNull(),
    );
  });

  it("returns to the dashboard by default", async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <>
        <AuthPage mode="signin" />
        <WhereAmI />
      </>,
      { route: "/signin" },
    );

    await user.type(screen.getByLabelText("Email"), "testtest@gmail.com");
    await user.type(screen.getByLabelText("Password"), "test-test-test-pass");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(screen.getByTestId("where")).toHaveTextContent("/dashboard"),
    );
  });

  it("omits unsupported password recovery", () => {
    renderAuth("/signin");
    expect(
      screen.queryByRole("link", { name: "Forgot password?" }),
    ).not.toBeInTheDocument();
  });

  it("hides Google when the backend reports it is unavailable", async () => {
    renderAuth("/signin");
    await waitFor(() => expect(auth.googleSignInAvailable).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Continue with Google" })).not.toBeInTheDocument();
  });

  it("shows the Google option and lets users retry after cancellation", async () => {
    auth.googleSignInAvailable.mockResolvedValue(true);
    renderAuth("/signin?google=canceled");
    expect(screen.getByRole("alert")).toHaveTextContent("Google sign-in was canceled");
    const button = await screen.findByRole("button", { name: "Continue with Google" });
    await userEvent.click(button);
    expect(auth.startGoogleSignIn).toHaveBeenCalledTimes(1);
  });

  it("has segment control with Sign In active", () => {
    renderAuth("/signin");
    expect(
      screen.getByRole("tab", { name: "Sign In", selected: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Create Account", selected: false }),
    ).toBeInTheDocument();
  });
});

describe("AuthPage sign up", () => {
  it("submits signup credentials with a ten-unit password", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AuthPage mode="signup" />, { route: "/signup" });

    await user.type(screen.getByLabelText("Full name"), "Test User");
    await user.type(screen.getByLabelText("Email"), "testtest@gmail.com");
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("minlength", "10");
    await user.type(password, "testpass10");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(auth.signUp).toHaveBeenCalledWith({
        email: "testtest@gmail.com",
        password: "testpass10",
        fullName: "Test User",
      }),
    );
  });

  it("accepts 128 UTF-16 units and blocks a longer signup password", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AuthPage mode="signup" />, { route: "/signup" });
    await user.type(screen.getByLabelText("Full name"), "Test User");
    await user.type(screen.getByLabelText("Email"), "unicode@example.test");
    const password = screen.getByLabelText("Password");
    const limit = "😀".repeat(64);
    const form = password.closest("form")!;

    fireEvent.change(password, { target: { value: limit + "a" } });
    fireEvent.submit(form);
    expect(await screen.findByRole("alert")).toHaveTextContent("Password is too long.");
    expect(auth.signUp).not.toHaveBeenCalled();

    fireEvent.change(password, { target: { value: limit } });
    fireEvent.submit(form);
    await waitFor(() => expect(auth.signUp).toHaveBeenCalledWith({
      email: "unicode@example.test", password: limit, fullName: "Test User",
    }));
  });

  it("swaps the copy between sign in and sign up", () => {
    const { unmount } = renderAuth("/signin");
    expect(
      screen.getByRole("heading", { name: "Welcome back" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Full name")).toBeNull();
    unmount();

    renderAuth("/signup", "signup");
    expect(
      screen.getByRole("heading", { name: "Create your account" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
  });

  it("offers only email and password", () => {
    renderAuth("/signup", "signup");
    expect(screen.queryByRole("button", { name: "Google" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apple" })).not.toBeInTheDocument();
  });

  it("has segment control with Create Account active", () => {
    renderAuth("/signup", "signup");
    expect(
      screen.getByRole("tab", { name: "Create Account", selected: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Sign In", selected: false }),
    ).toBeInTheDocument();
  });
});
