import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { buildShop } from '@/test/factories/shops.factory';
import { apiPath } from '@/test/mocks/handlers/context';
import { server } from '@/test/mocks/server';
import { renderHookWithProviders } from '@/test/render';

const user = { id: 'u1', email: 'neuton@example.test', fullName: 'Test User', avatarUrl: null };
const credentials = { email: user.email, password: 'a long test password' };
const shop = buildShop({ id: 'confirmed-shop' });
const expires = new Date(Date.now() + 86_400_000).toISOString();
const session = {
  id: 'session-reference', lastActivityAt: new Date().toISOString(),
  idleExpiresAt: expires, absoluteExpiresAt: expires, nextRenewalAt: expires,
};
const authorized = () => HttpResponse.json({ user, session, memberships: [{ role: 'owner', shop }] });

afterEach(() => {
  localStorage.clear();
  vi.resetModules();
});

it.each(['sign_in', 'link'] as const)('finishes Google %s with fresh CSRF proof and refreshes the server session', async (purpose) => {
  const calls: string[] = [];
  server.use(
    http.get(apiPath('/auth/google/status'), () => HttpResponse.json({ enabled: true })),
    http.post(apiPath('/auth/session/renew'), () => HttpResponse.json(session)),
    http.post(apiPath('/auth/csrf'), () => {
      calls.push('csrf');
      return HttpResponse.json({ token: `proof-${calls.length}` });
    }),
    http.post(apiPath('/auth/google/complete'), async ({ request }) => {
      calls.push('complete');
      expect(request.headers.get('x-csrf-token')).toBe('proof-2');
      const completion = { completionId: 'completion-fixture' };
      expect(await request.json()).toEqual(purpose === 'link' ? { ...completion, purpose } : completion);
      return HttpResponse.json({ outcome: 'completed' });
    }),
    http.get(apiPath('/session'), () => {
      calls.push('session');
      return authorized();
    }),
  );
  const auth = await import('./auth');
  expect(await auth.googleSignInAvailable()).toBe(true);
  expect(calls).toEqual([]);
  const { apiFetch } = await import('@/lib/api');
  await apiFetch('/auth/session/renew', { method: 'POST' });
  await auth.completeGoogleSignIn('completion-fixture', purpose);
  expect(calls).toEqual(['csrf', 'csrf', 'complete', 'session']);
  const { result } = renderHookWithProviders(auth.useAuth);
  expect(result.current.user).toEqual(user);
});

it('keeps a pending unlink from racing a password change and refreshes the existing session', async () => {
  let linked = true;
  const change = vi.fn();
  let beginUnlink!: () => void;
  const unlinkStarted = new Promise<void>((resolve) => { beginUnlink = resolve; });
  let releaseUnlink!: () => void;
  const unlinkPending = new Promise<void>((resolve) => { releaseUnlink = resolve; });
  server.use(
    http.get(apiPath('/session'), () => HttpResponse.json({ user, session, memberships: [], googleLinked: linked, hasPassword: true })),
    http.delete(apiPath('/auth/google/link'), async () => {
      beginUnlink();
      await unlinkPending;
      linked = false;
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(apiPath('/profile/password'), () => {
      change();
      return HttpResponse.json({ ok: true });
    }),
  );
  const auth = await import('./auth');
  await auth.restoreSession();
  const pending = auth.unlinkGoogle();
  await unlinkStarted;
  try {
    await expect(auth.changePassword({ currentPassword: 'current password', newPassword: 'new password' }))
      .rejects.toMatchObject({ code: 'SIGN_IN_METHOD_BUSY' });
  } finally {
    releaseUnlink();
  }
  await pending;
  expect(change).not.toHaveBeenCalled();
  const { result } = renderHookWithProviders(auth.useAuth);
  expect(result.current.sessionId).toBe(session.id);
  expect(result.current.session?.googleLinked).toBe(false);
});

it('refreshes the password flag when another session already set the first password', async () => {
  let hasPassword = false;
  server.use(
    http.get(apiPath('/session'), () => HttpResponse.json({ user, session, memberships: [], googleLinked: true, hasPassword })),
    http.post(apiPath('/auth/password/add'), () => {
      hasPassword = true;
      return HttpResponse.json({
        error: { code: 'PASSWORD_ALREADY_SET', message: 'Use Change password to update your existing password.' },
      }, { status: 409 });
    }),
  );
  const auth = await import('./auth');
  await auth.restoreSession();
  await expect(auth.addPassword('another new password')).rejects.toMatchObject({ code: 'PASSWORD_ALREADY_SET' });
  const { result } = renderHookWithProviders(auth.useAuth);
  expect(result.current.sessionId).toBe(session.id);
  expect(result.current.session?.hasPassword).toBe(true);
});

it('signs up with a CSRF proof and restores only server-confirmed shops after reload', async () => {
  let signedIn = false;
  server.use(
    http.post(apiPath('/auth/signup'), async ({ request }) => {
      expect(request.credentials).toBe('same-origin');
      expect(request.headers.get('x-csrf-token')).toBe('test-csrf');
      expect(request.headers.has('authorization')).toBe(false);
      expect(await request.json()).toEqual({ ...credentials, fullName: user.fullName });
      signedIn = true;
      return HttpResponse.json({ user }, { status: 201 });
    }),
    http.get(apiPath('/session'), () => signedIn ? authorized() : new HttpResponse(null, { status: 401 })),
  );
  localStorage.setItem('neuton.activeShopId', 'stale-shop');
  const auth = await import('./auth');
  await auth.signUp({ ...credentials, fullName: user.fullName });
  expect(localStorage.getItem('neuton.activeShopId')).toBe(shop.id);
  expect(JSON.stringify(localStorage)).not.toContain(session.id);
  vi.resetModules();
  const fresh = await import('./auth');
  const { result } = renderHookWithProviders(() => {
    const current = fresh.useAuth();
    return { current, shops: fresh.useShopMemberships(current.user?.id) };
  });
  expect(result.current.current.loading).toBe(true);
  await waitFor(() => expect(result.current.current.user).toEqual(user));
  expect(result.current.shops.activeShopId).toBe(shop.id);
});

it('surfaces bad credentials and distinguishes restore outage from anonymous', async () => {
  server.use(
    http.post(apiPath('/auth/signin'), async ({ request }) => {
      const input = await request.json();
      if (JSON.stringify(input) === JSON.stringify(credentials)) return HttpResponse.json({ user });
      return HttpResponse.json({ error: { message: 'Invalid email or password' } }, { status: 401 });
    }),
    http.get(apiPath('/session'), () => new HttpResponse(null, { status: 503 })),
  );
  const auth = await import('./auth');
  await expect(auth.signIn({ ...credentials, password: 'wrong' })).rejects.toThrow('Invalid email or password');
  const { result } = renderHookWithProviders(auth.useAuth);
  await waitFor(() => expect(result.current.unavailable).toBe(true));
  expect(result.current.user).toBeNull();
  server.use(http.get(apiPath('/session'), authorized));
  await act(() => auth.signIn(credentials));
  expect(result.current.user).toEqual(user);
});

it('requires recent foreground interaction and shares concurrent renewal calls', async () => {
  let renewals = 0;
  server.use(
    http.get(apiPath('/session'), () => HttpResponse.json({ user, session: { ...session, nextRenewalAt: new Date(0).toISOString() }, memberships: [] })),
    http.post(apiPath('/auth/session/renew'), () => { renewals++; return HttpResponse.json(session); }),
  );
  const auth = await import('./auth');
  const visibility = vi.spyOn(document, 'visibilityState', 'get');
  visibility.mockReturnValue('hidden');
  await auth.restoreSession();
  auth.renewOnInteraction();
  expect(renewals).toBe(0);
  visibility.mockReturnValue('visible');
  auth.renewOnInteraction();
  auth.renewOnInteraction();
  await waitFor(() => expect(renewals).toBe(1));
});

it('reports an unconfirmed logout-all separately when the current session is lost', async () => {
  server.use(
    http.get(apiPath('/session'), authorized),
    http.post(apiPath('/auth/logout-all'), () => HttpResponse.error()),
  );
  const auth = await import('./auth');
  const { result } = renderHookWithProviders(auth.useAuth);
  await waitFor(() => expect(result.current.user).toEqual(user));
  await act(async () => { await expect(auth.signOut(true)).rejects.toThrow(); });
  expect(result.current.message).toBe('Sign-out everywhere could not be confirmed.');
  server.use(http.get(apiPath('/session'), () => new HttpResponse(null, { status: 401 })));
  await act(() => auth.restoreSession());
  expect(result.current.message).toBe('This browser is signed out. Sign-out everywhere could not be confirmed.');
});
