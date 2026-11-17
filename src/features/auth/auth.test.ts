import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
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

beforeEach(() => {
  // Each module reload represents a separate browser; do not broadcast across test cases.
  vi.stubGlobal('BroadcastChannel', undefined);
});

afterEach(() => {
  localStorage.clear();
  vi.resetModules();
});

it('keeps the current session and request scope when sync encounters a session-store outage', async () => {
  server.use(
    http.get(apiPath('/session'), authorized),
    http.get(apiPath('/sync/check'), () => HttpResponse.json({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Session store unavailable' },
    }, { status: 503 })),
  );
  const auth = await import('./auth');
  await auth.restoreSession();
  const { apiFetch, requestScopeSignal } = await import('@/lib/api');
  const signal = requestScopeSignal(user.id, shop.id);
  const { result } = renderHookWithProviders(auth.useAuth);
  await act(async () => {
    await expect(apiFetch('/sync/check', { userId: user.id, shopId: shop.id })).rejects.toMatchObject({ status: 503 });
  });
  expect(result.current.sessionId).toBe(session.id);
  expect(signal?.aborted).toBe(false);
});

it('silently rechecks the session and retries a request rejected with 401', async () => {
  let checks = 0;
  server.use(
    http.get(apiPath('/session'), authorized),
    http.get(apiPath('/sync/check'), () => {
      checks++;
      if (checks === 1) return new HttpResponse(null, { status: 401 });
      return HttpResponse.json({ ok: true });
    }),
  );
  const auth = await import('./auth');
  await auth.restoreSession();
  const { apiFetch } = await import('@/lib/api');
  await expect(apiFetch('/sync/check', { userId: user.id, shopId: shop.id })).resolves.toEqual({ ok: true });
  const { result } = renderHookWithProviders(auth.useAuth);
  expect(result.current.sessionId).toBe(session.id);
  expect(checks).toBe(2);
});

it('preserves an established session when a background session refresh is unavailable', async () => {
  server.use(http.get(apiPath('/session'), authorized));
  const auth = await import('./auth');
  await auth.restoreSession();
  const { result } = renderHookWithProviders(auth.useAuth);
  server.use(http.get(apiPath('/session'), () => new HttpResponse(null, { status: 503 })));
  await act(() => auth.restoreSession());
  expect(result.current.sessionId).toBe(session.id);
  expect(result.current.unavailable).toBe(false);
});

it('clears the session only after the server confirms it can no longer be restored', async () => {
  server.use(http.get(apiPath('/session'), authorized));
  const auth = await import('./auth');
  await auth.restoreSession();
  const { result } = renderHookWithProviders(auth.useAuth);
  server.use(
    http.get(apiPath('/session'), () => new HttpResponse(null, { status: 401 })),
    http.get(apiPath('/sync/check'), () => new HttpResponse(null, { status: 401 })),
  );
  const { apiFetch } = await import('@/lib/api');
  await act(async () => {
    await expect(apiFetch('/sync/check', { userId: user.id, shopId: shop.id })).rejects.toMatchObject({ status: 401 });
  });
  expect(result.current.user).toBeNull();
});

it('shares concurrent silent recovery and limits each failed request to one retry', async () => {
  let sessionReads = 0;
  let checks = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  server.use(
    http.get(apiPath('/session'), async () => {
      sessionReads++;
      if (sessionReads > 1) await pending;
      return authorized();
    }),
    http.get(apiPath('/sync/check'), () => {
      checks++;
      return new HttpResponse(null, { status: 401 });
    }),
  );
  const auth = await import('./auth');
  await auth.restoreSession();
  const { apiFetch } = await import('@/lib/api');
  const first = expect(apiFetch('/sync/check', { userId: user.id, shopId: shop.id })).rejects.toMatchObject({ status: 401 });
  const second = expect(apiFetch('/sync/check', { userId: user.id, shopId: shop.id })).rejects.toMatchObject({ status: 401 });
  await waitFor(() => expect(checks).toBe(2));
  await waitFor(() => expect(sessionReads).toBe(2));
  release();
  await Promise.all([first, second]);
  expect(sessionReads).toBe(2);
  expect(checks).toBe(4);
});

it('retries foreground renewal after an outage without losing the current session', async () => {
  let renewals = 0;
  server.use(
    http.get(apiPath('/session'), () => HttpResponse.json({ user,
      session: { ...session, nextRenewalAt: new Date(0).toISOString() }, memberships: [] })),
    http.post(apiPath('/auth/session/renew'), () => {
      renewals++;
      if (renewals === 1) return new HttpResponse(null, { status: 503 });
      return HttpResponse.json(session);
    }),
  );
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  const auth = await import('./auth');
  await auth.restoreSession();
  const { result } = renderHookWithProviders(auth.useAuth);
  auth.renewOnInteraction();
  await waitFor(() => expect(renewals).toBe(1));
  expect(result.current.sessionId).toBe(session.id);
  auth.renewOnInteraction();
  await waitFor(() => expect(result.current.session?.session.nextRenewalAt).toBe(session.nextRenewalAt));
  expect(renewals).toBe(2);
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
  expect(result.current.message).toBeUndefined();
  await act(async () => {
    await expect(auth.signIn(credentials)).rejects.toMatchObject({ code: 'SESSION_CONFIRMATION_FAILED' });
  });
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
