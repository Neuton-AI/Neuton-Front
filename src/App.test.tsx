import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from './test/render';

/**
 * App is the routing table plus two guards. These tests mount it for real but
 * stub every page, so the suite covers routing and auth without any network,
 * and a failure points at a route rather than at somebody's data layer.
 *
 * Nothing here asserts on Supabase configuration state: the pages' behaviour
 * differs depending on whether a developer's local `.env` is present, so the
 * assertions deliberately stay on the URL and on page identity.
 */

const authState = vi.hoisted(() => ({
  session: null as { user: { id: string } } | null,
  loading: false,
}));

const supabaseAuth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(async () => ({ error: null })),
  signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
}));

vi.mock('./lib/supabase', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/supabase')>()),
  // A fake client so AuthPage renders its real form regardless of whether the
  // developer's machine happens to have a .env with Supabase keys.
  supabase: { auth: supabaseAuth },
  isSupabaseConfigured: true,
  useAuth: () => ({
    session: authState.session,
    loading: authState.loading,
    user: authState.session?.user ?? null,
    token: null,
  }),
}));

/**
 * Stubs a lazy page module with a single identifiable heading. `vi.mock` only
 * hoists literal specifiers, so these are written out rather than looped.
 */
vi.mock('./pages/DashboardPage', () => ({ DashboardPage: () => <h1>Dashboard</h1> }));
vi.mock('./pages/CatalogPage', () => ({ CatalogPage: () => <h1>Catalog</h1> }));
vi.mock('./pages/OrdersPage', () => ({ OrdersPage: () => <h1>Orders</h1> }));
vi.mock('./pages/NewOrderPage', () => ({ NewOrderPage: () => <h1>New order</h1> }));
vi.mock('./pages/OrderDetailPage', () => ({ OrderDetailPage: () => <h1>Order detail</h1> }));
vi.mock('./pages/ProfilePage', () => ({ ProfilePage: () => <h1>Profile</h1> }));
vi.mock('./pages/CapturePage', () => ({ CapturePage: () => <h1>Capture</h1> }));
vi.mock('./pages/RecipeDetailPage', () => ({ RecipeDetailPage: () => <h1>Recipe detail</h1> }));
vi.mock('./pages/ReceiptDetailPage', () => ({ ReceiptDetailPage: () => <h1>Receipt detail</h1> }));

const { App } = await import('./App');

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
});

describe('RequireAuth', () => {
  it('waits on the loader instead of redirecting while the session resolves', async () => {
    // Redirecting mid-resolve bounces a signed-in user to sign-in on every
    // hard refresh.
    authState.loading = true;
    authState.session = { user: { id: 'u1' } };

    renderApp('/dashboard');

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/dashboard');
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).toBeNull();
  });

  it('sends an anonymous visitor from a protected route to sign-in', async () => {
    authState.session = null;

    renderApp('/dashboard');

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/signin'));
  });

  it('never mounts the protected page for an anonymous visitor', async () => {
    authState.session = null;

    renderApp('/orders/o-123');

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/signin'));
    expect(screen.queryByRole('heading', { name: 'Order detail' })).toBeNull();
  });

  it('leaves the sign-in route reachable without a session', async () => {
    authState.session = null;

    renderApp('/signin');

    // No bounce back to the dashboard, and no second redirect.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByTestId('where')).toHaveTextContent('/signin');
  });
});

describe('routing', () => {
  beforeEach(() => {
    authState.session = { user: { id: 'u1' } };
  });

  it('renders the dashboard for a signed-in visitor', async () => {
    renderApp('/dashboard');

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it.each([
    ['/catalog', 'Catalog'],
    ['/orders', 'Orders'],
    ['/profile', 'Profile'],
    ['/capture', 'Capture'],
    ['/orders/new', 'New order'],
  ])('routes %s to its page', async (route, heading) => {
    renderApp(route);

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent(route);
  });

  it.each([
    ['/orders/o-1', 'Order detail'],
    ['/catalog/recipes/r-1', 'Recipe detail'],
    ['/catalog/receipts/rc-1', 'Receipt detail'],
  ])('routes the deep link %s to its detail sheet', async (route, heading) => {
    // These are the URLs people paste from Slack; they must survive a reload.
    renderApp(route);

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('redirects an unknown private route to the dashboard', async () => {
    renderApp('/nope/does-not-exist');

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/dashboard'));
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('sends the root path to the dashboard when signed in', async () => {
    renderApp('/');

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/dashboard'));
  });

  it('sends the root path to sign-in when signed out', async () => {
    authState.session = null;

    renderApp('/');

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/signin'));
  });
});

describe('deep-link round trip', () => {
  beforeEach(() => {
    authState.session = null;
    supabaseAuth.signInWithPassword.mockClear();
  });

  it('brings the user back to the deep link they originally asked for', async () => {
    // The whole point of the guard storing `state.from`: a link to a specific
    // order that hits a signed-out user must not dump them on the dashboard
    // after they sign in.
    const user = userEvent.setup();

    // Stand in for supabase's onAuthStateChange, which is what makes the guard
    // let them through in the real app.
    supabaseAuth.signInWithPassword.mockImplementationOnce(async () => {
      authState.session = { user: { id: 'u1' } };
      return { error: null };
    });

    renderApp('/orders/o-123');

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/signin'));

    await user.type(screen.getByLabelText('Email'), 'testtest@gmail.com');
    await user.type(screen.getByLabelText('Password'), 'testTest');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/orders/o-123'));
  });
});
