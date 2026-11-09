import { renderWithRouter } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * App is the routing table plus two guards. These tests mount it for real but
 * stub every page, so the suite covers routing and auth without any network,
 * and a failure points at a route rather than at somebody's data layer.
 */

const authState = vi.hoisted(() => ({
  session: null as { user: { id: string } } | null,
  loading: false,
  unavailable: false,
}));

const authActions = vi.hoisted(() => ({
  signIn: vi.fn(async () => {}),
  signUp: vi.fn(async () => {}),
}));

vi.mock("@/features/auth/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth/auth")>()),
  ...authActions,
  useAuth: () => ({
    session: authState.session,
    loading: authState.loading,
    unavailable: authState.unavailable,
    user: authState.session?.user ?? null,
    userId: null,
  }),
}));

/**
 * Stubs a lazy page module with a single identifiable heading. `vi.mock` only
 * hoists literal specifiers, so these are written out rather than looped.
 */
vi.mock("@/pages/DashboardPage/DashboardPage", () => ({
  DashboardPage: () => <h1>Dashboard</h1>,
}));
vi.mock("@/pages/CatalogPage/CatalogPage", () => ({
  CatalogPage: () => <h1>Catalog</h1>,
}));
vi.mock("@/pages/OrdersPage/OrdersPage", () => ({
  OrdersPage: () => <h1>Orders</h1>,
}));
vi.mock("@/pages/NewOrderPage/NewOrderPage", () => ({
  NewOrderPage: () => <h1>New order</h1>,
}));
vi.mock("@/pages/NotFoundPage/NotFoundPage", () => ({
  NotFoundPage: () => <h1>Page not found</h1>,
}));
vi.mock("@/pages/OrderDetailPage/OrderDetailPage", () => ({
  OrderDetailPage: () => <h1>Order detail</h1>,
}));
vi.mock("@/pages/ProfilePage/ProfilePage", () => ({
  ProfilePage: () => <h1>Profile</h1>,
}));
vi.mock("@/pages/CapturePage/CapturePage", () => ({
  CapturePage: () => <h1>Capture</h1>,
}));
vi.mock("@/pages/RecipeDetailPage/RecipeDetailPage", () => ({
  RecipeDetailPage: () => <h1>Recipe detail</h1>,
}));
vi.mock("@/pages/ReceiptDetailPage/ReceiptDetailPage", () => ({
  ReceiptDetailPage: () => <h1>Receipt detail</h1>,
}));

const { App } = await import("@/App");

const WhereAmI = () => {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{`${pathname}${search}`}</output>;
};

function renderApp(route: string) {
  return renderWithRouter(
    <>
      <Routes>
        <Route path="*" element={<App />} />
      </Routes>
      <WhereAmI />
    </>,
    { route },
  );
}

beforeEach(() => {
  authState.session = null;
  authState.loading = false;
  authState.unavailable = false;
});

describe("RequireAuth", () => {
  it("waits on the loader instead of redirecting while the session resolves", async () => {
    // Redirecting mid-resolve bounces a signed-in user out on every hard refresh.
    authState.loading = true;
    authState.session = { user: { id: "u1" } };

    renderApp("/dashboard");

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent("/dashboard");
    expect(screen.queryByRole("heading", { name: "Dashboard" })).toBeNull();
  });

  it.each([false, true])("shows the landing page from a protected route with no session (unavailable: %s)", async (unavailable) => {
    authState.unavailable = unavailable;

    renderApp("/orders/o-123");

    await screen.findByRole("heading", { name: "Just upload. Neuton takes care of the numbers." });
    expect(screen.getByTestId("where")).toHaveTextContent("/landing");
    expect(screen.queryByRole("heading", { name: "Order detail" })).toBeNull();
  });

  it("shows the landing page when the root session check is unavailable", async () => {
    authState.unavailable = true;

    renderApp("/");

    await screen.findByRole("heading", { name: "Just upload. Neuton takes care of the numbers." });
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/$/);
  });

  it("leaves the sign-in route reachable without a session", async () => {
    authState.session = null;

    renderApp("/signin");

    // No bounce back to the dashboard, and no second redirect.
    await screen.findByRole("heading", { name: "Welcome back" });
    expect(screen.getByTestId("where")).toHaveTextContent("/signin");
  });
});

describe("routing", () => {
  beforeEach(() => {
    authState.session = { user: { id: "u1" } };
  });

  it("renders the dashboard for a signed-in visitor", async () => {
    renderApp("/dashboard");

    expect(
      await screen.findByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["/catalog", "Catalog"],
    ["/orders", "Orders"],
    ["/profile", "Profile"],
    ["/capture", "Capture"],
    ["/orders/new", "New order"],
  ])("routes %s to its page", async (route, heading) => {
    renderApp(route);

    expect(
      await screen.findByRole("heading", { name: heading }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent(route);
  });

  it.each([
    ["/orders/o-1", "Order detail"],
    ["/catalog/recipes/r-1", "Recipe detail"],
    ["/catalog/receipts/rc-1", "Receipt detail"],
  ])("routes the deep link %s to its detail sheet", async (route, heading) => {
    // These are the URLs people paste from Slack; they must survive a reload.
    renderApp(route);

    expect(
      await screen.findByRole("heading", { name: heading }),
    ).toBeInTheDocument();
  });

  it("shows the not-found page for an unknown private route without redirecting", async () => {
    // Silently redirecting masked broken deep links, so the URL must stay put
    // and the NotFound screen must be the one that renders.
    renderApp("/nope/does-not-exist");

    expect(
      await screen.findByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent(
      "/nope/does-not-exist",
    );
    expect(screen.queryByRole("heading", { name: "Dashboard" })).toBeNull();
  });

  it("sends the root path to the dashboard when signed in", async () => {
    renderApp("/");

    await waitFor(() =>
      expect(screen.getByTestId("where")).toHaveTextContent("/dashboard"),
    );
  });

  it("renders the landing page on the root path when signed out", async () => {
    authState.session = null;

    renderApp("/");

    expect(screen.getByTestId("where")).toHaveTextContent("/");
    expect(
      await screen.findByRole("heading", {
        name: "Just upload. Neuton takes care of the numbers.",
      }),
    ).toBeInTheDocument();
  });

  it("renders the landing page on /landing", async () => {
    renderApp("/landing");

    expect(screen.getByTestId("where")).toHaveTextContent("/landing");
    expect(
      await screen.findByRole("heading", {
        name: "Just upload. Neuton takes care of the numbers.",
      }),
    ).toBeInTheDocument();
  });
});

describe("deep-link round trip", () => {
  beforeEach(() => {
    authState.session = null;
    authActions.signIn.mockClear();
  });

  it("returns to a protected deep link after signing in from the landing page", async () => {
    const user = userEvent.setup();

    authActions.signIn.mockImplementationOnce(async () => {
      authState.session = { user: { id: "u1" } };
    });

    renderApp("/orders/o-123");

    await user.click(await screen.findByRole("link", { name: "Log in" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/signin");
    await user.type(screen.getByLabelText("Email"), "testtest@gmail.com");
    await user.type(screen.getByLabelText("Password"), "testTest");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(screen.getByTestId("where")).toHaveTextContent("/orders/o-123"),
    );
  });
});

vi.mock("@/features/sync/SyncStatus", () => ({ SyncStatus: () => null }));
