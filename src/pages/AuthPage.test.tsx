import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '../test/render';

/**
 * AuthPage owns one behaviour that nothing else in the app can cover: after a
 * successful sign-in it must return the user to wherever RequireAuth bounced
 * them from. That round trip is why the guard stores `state.from`, so the two
 * halves are pinned here against a fake Supabase client.
 */

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: { auth },
  isSupabaseConfigured: true,
  useAuth: () => ({ session: null, loading: false, user: null, token: null }),
}));

const { AuthPage } = await import('./AuthPage');

const WhereAmI = () => {
  const { pathname } = useLocation();
  return <output data-testid="where">{pathname}</output>;
};

/** Renders AuthPage together with a probe of the current route. */
function renderAuth(route: string, mode: 'signin' | 'signup' = 'signin') {
  return renderWithRouter(
    <>
      <AuthPage mode={mode} />
      <WhereAmI />
    </>,
    { route },
  );
}

beforeEach(() => {
  auth.signInWithPassword.mockReset();
  auth.signUp.mockReset();
  auth.signInWithPassword.mockResolvedValue({ error: null });
  auth.signUp.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });
});

describe('AuthPage sign in', () => {
  it('labels both fields and requires them', () => {
    renderAuth('/signin');

    const email = screen.getByLabelText('Email');
    const password = screen.getByLabelText('Password');

    expect(email).toBeRequired();
    expect(email).toHaveAttribute('type', 'email');
    // current-password, not new-password: the password manager must offer to
    // fill an existing credential instead of generating one.
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    expect(password).toHaveAttribute('minlength', '8');
  });

  it('submits the typed credentials to Supabase', async () => {
    const user = userEvent.setup();
    renderAuth('/signin');

    await user.type(screen.getByLabelText('Email'), 'testtest@gmail.com');
    await user.type(screen.getByLabelText('Password'), 'testTest');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'testtest@gmail.com',
        password: 'testTest',
      }),
    );
  });

  it('surfaces a rejected sign-in as an alert and stays put', async () => {
    const user = userEvent.setup();
    auth.signInWithPassword.mockResolvedValue({ error: new Error('Invalid login credentials') });
    renderAuth('/signin');

    await user.type(screen.getByLabelText('Email'), 'testtest@gmail.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials');
    expect(screen.getByTestId('where')).toHaveTextContent('/signin');
  });

  it('disables the submit button while the request is in flight', async () => {
    const user = userEvent.setup();
    let release: (() => void) | undefined;
    auth.signInWithPassword.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({ error: null });
      }),
    );
    renderAuth('/signin');

    await user.type(screen.getByLabelText('Email'), 'testtest@gmail.com');
    await user.type(screen.getByLabelText('Password'), 'testTest');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    // Without this, a double-tap fires two sign-in requests.
    expect(screen.getByRole('button', { name: 'Working…' })).toBeDisabled();

    release?.();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Working…' })).toBeNull());
  });

  it('returns to the dashboard by default', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <>
        <AuthPage mode="signin" />
        <WhereAmI />
      </>,
      { route: '/signin' },
    );

    await user.type(screen.getByLabelText('Email'), 'testtest@gmail.com');
    await user.type(screen.getByLabelText('Password'), 'testTest');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/dashboard'));
  });
});

describe('AuthPage sign up', () => {
  it('adds the shop name field and sends it as signup metadata', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AuthPage mode="signup" />, { route: '/signup' });

    await user.type(screen.getByLabelText('Shop name'), 'testShop');
    await user.type(screen.getByLabelText('Email'), 'testtest@gmail.com');
    await user.type(screen.getByLabelText('Password'), 'testTest');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(auth.signUp).toHaveBeenCalledWith({
        email: 'testtest@gmail.com',
        password: 'testTest',
        options: { data: { shopName: 'testShop' } },
      }),
    );
  });

  it('asks the user to confirm their email when signup returns no session', async () => {
    const user = userEvent.setup();
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    renderWithRouter(<AuthPage mode="signup" />, { route: '/signup' });

    await user.type(screen.getByLabelText('Shop name'), 'testShop');
    await user.type(screen.getByLabelText('Email'), 'testtest@gmail.com');
    await user.type(screen.getByLabelText('Password'), 'testTest');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    // Signing in here would fail, so this must be a status message and not a
    // navigation.
    expect(await screen.findByRole('status')).toHaveTextContent(/check your inbox/i);
  });

  it('swaps the copy between sign in and sign up', () => {
    const { unmount } = renderAuth('/signin');
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Shop name')).toBeNull();
    unmount();

    renderAuth('/signup', 'signup');
    expect(screen.getByRole('heading', { name: 'Start cooking' })).toBeInTheDocument();
    expect(screen.getByLabelText('Shop name')).toBeInTheDocument();
  });

  it('links each mode to the other', () => {
    renderWithRouter(<AuthPage mode="signin" />, { route: '/signin' });

    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/signup',
    );
  });
});
