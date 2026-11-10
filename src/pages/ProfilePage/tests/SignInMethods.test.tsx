import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { expect, it, vi } from 'vitest';
import { restoreSession } from '@/features/auth/auth';
import { apiPath } from '@/test/mocks/handlers/context';
import { server } from '@/test/mocks/server';
import { renderWithRouter } from '@/test/render';
import { SignInMethods } from '../components/SignInMethods';

const email = 'profile@example.test';
const sessionId = 'profile-sign-in-methods';

function serveSession(methods: { hasPassword: boolean; googleLinked: boolean }, enabled = true) {
  const expires = new Date(Date.now() + 60_000).toISOString();
  server.use(
    http.get(apiPath('/session'), () => HttpResponse.json({
      user: { id: 'profile-user', email },
      memberships: [],
      session: { id: sessionId, idleExpiresAt: expires, absoluteExpiresAt: expires, nextRenewalAt: expires },
      ...methods,
    })),
    http.get(apiPath('/auth/google/status'), () => HttpResponse.json({ enabled })),
    http.post(apiPath('/auth/csrf'), () => HttpResponse.json({ token: 'profile-proof' })),
  );
}

it('adds a password and confirms selective unlinking without replacing the session', async () => {
  const methods = { hasPassword: false, googleLinked: true };
  serveSession(methods);
  const unlink = vi.fn();
  const password = 'first-profile-password';
  server.use(
    http.post(apiPath('/auth/password/add'), async ({ request }) => {
      expect(request.headers.get('x-session-id')).toBe(sessionId);
      expect(request.headers.get('x-csrf-token')).toBe('profile-proof');
      expect(await request.json()).toEqual({ newPassword: password });
      methods.hasPassword = true;
      return new HttpResponse(null, { status: 204 });
    }),
    http.delete(apiPath('/auth/google/link'), ({ request }) => {
      unlink();
      expect(request.headers.get('x-session-id')).toBe(sessionId);
      expect(request.headers.get('x-csrf-token')).toBe('profile-proof');
      methods.googleLinked = false;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  await restoreSession();
  renderWithRouter(<SignInMethods email={email} />);
  const user = userEvent.setup();
  expect(screen.getByText(/Add a password before unlinking/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Unlink Google' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument();
  await user.type(screen.getByLabelText('New password'), password);
  await user.click(screen.getByRole('button', { name: 'Add a password' }));
  expect(await screen.findByRole('button', { name: 'Change password' })).toBeInTheDocument();

  const unlinkButton = await screen.findByRole('button', { name: 'Unlink Google' });
  await user.click(unlinkButton);
  const dialog = within(screen.getByRole('dialog'));
  expect(dialog.getByText(/Other sessions signed in with Google will be signed out/)).toBeInTheDocument();
  await user.click(dialog.getByRole('button', { name: 'Cancel' }));
  expect(unlink).not.toHaveBeenCalled();
  await user.click(unlinkButton);
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Unlink Google' }));
  expect(await screen.findByText('Google unlinked.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Link Google' })).toBeInTheDocument();
  expect(unlink).toHaveBeenCalledTimes(1);
});

it('keeps the password form and lets the user retry linking after cancellation and outage', async () => {
  serveSession({ hasPassword: true, googleLinked: false });
  server.use(http.post(apiPath('/auth/google/start'), async ({ request }) => {
    expect(request.headers.get('x-session-id')).toBe(sessionId);
    expect(await request.json()).toEqual({ purpose: 'link' });
    return HttpResponse.json({ error: { message: 'Google is temporarily unavailable.' } }, { status: 503 });
  }));
  await restoreSession();
  renderWithRouter(<SignInMethods email={email} />, { route: '/profile?google=canceled' });
  expect(screen.getByRole('status')).toHaveTextContent('Google linking was canceled');
  const link = await screen.findByRole('button', { name: 'Link Google' });
  await userEvent.click(link);
  expect(await screen.findByText('Google is temporarily unavailable.')).toBeInTheDocument();
  expect(link).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Change password' })).toBeInTheDocument();
});

it('lets the user retry the availability check and hides actions when Google is disabled', async () => {
  serveSession({ hasPassword: true, googleLinked: true }, false);
  let attempts = 0;
  server.use(http.get(apiPath('/auth/google/status'), () => {
    attempts++;
    if (attempts === 1) return new HttpResponse(null, { status: 503 });
    return HttpResponse.json({ enabled: false });
  }));
  await restoreSession();
  renderWithRouter(<SignInMethods email={email} />);
  const check = await screen.findByRole('button', { name: 'Check again' });
  expect(screen.getByText('Google sign-in status could not be checked.')).toBeInTheDocument();
  await userEvent.click(check);
  expect(screen.getByText('Google is linked.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Unlink Google' })).not.toBeInTheDocument();
});
