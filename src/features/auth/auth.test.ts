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
