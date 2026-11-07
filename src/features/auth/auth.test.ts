import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { buildShop } from '@/test/factories/shops.factory';
import { apiPath } from '@/test/mocks/handlers/context';
import { server } from '@/test/mocks/server';
import { renderHookWithProviders } from '@/test/render';
import { signIn, signOut, signUp, useAuth, useShopMemberships } from './auth';

const user = { id: 'u1', email: 'neuton@example.com', fullName: 'Test User', avatarUrl: null };
const credentials = { email: user.email, password: 'a long test password' };
const token = `header.${btoa(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;
const activeShopKey = 'neuton.activeShopId';

afterEach(() => {
  signOut();
  localStorage.clear();
  sessionStorage.clear();
});

it('signs up immediately, keeps the token in memory, and sends it for memberships', async () => {
  const shop = buildShop({ id: 'actual-shop' });
  const body = { ...credentials, fullName: user.fullName };
  server.use(
    http.post(apiPath('/auth/signup'), async ({ request }) => {
      expect(await request.json()).toEqual(body);
      return HttpResponse.json({ token, user }, { status: 201 });
    }),
    http.get(apiPath('/session'), ({ request }) => {
      expect(request.headers.get('authorization')).toBe(`Bearer ${token}`);
      return HttpResponse.json({ user, memberships: [{ role: 'owner', shop }] });
    }),
  );
  localStorage.setItem(activeShopKey, 'stale-shop');
  const { result } = renderHookWithProviders(() => {
    const auth = useAuth();
    return { auth, shops: useShopMemberships(auth.user?.id) };
  });
  await act(() => signUp(body));
  expect(result.current.auth.token).toBe(token);
  await waitFor(() => expect(result.current.shops.activeShopId).toBe(shop.id));
  expect(localStorage.getItem(activeShopKey)).toBe(shop.id);
  expect(JSON.stringify(localStorage)).not.toContain(token);
  expect(JSON.stringify(sessionStorage)).not.toContain(token);

  vi.resetModules();
  const freshModule = await import('./auth');
  const fresh = renderHookWithProviders(freshModule.useAuth);
  expect(fresh.result.current.token).toBeNull();

  act(signOut);
  expect(result.current.auth.token).toBeNull();
  expect(result.current.shops.memberships).toEqual([]);
  expect(localStorage.getItem(`neuton.memberships:${user.id}`)).toBeNull();
});

it('signs in with the same endpoint contract and surfaces bad credentials', async () => {
  server.use(http.post(apiPath('/auth/signin'), async ({ request }) => {
    const input = await request.json();
    if (JSON.stringify(input) === JSON.stringify(credentials)) {
      return HttpResponse.json({ token, user });
    }
    return HttpResponse.json({ error: { message: 'Invalid email or password' } }, { status: 401 });
  }));
  await expect(signIn({ ...credentials, password: 'wrong' })).rejects.toThrow('Invalid email or password');
  await signIn(credentials);
  expect(renderHookWithProviders(useAuth).result.current.user).toEqual(user);
});

it('keeps the selected shop while valid and clears it after membership removal', async () => {
  const shops = [buildShop({ id: 'first' }), buildShop({ id: 'selected' })];
  let memberships = shops.map((shop) => ({ shop, role: 'owner' }));
  server.use(
    http.post(apiPath('/auth/signin'), () => HttpResponse.json({ token, user })),
    http.get(apiPath('/session'), () => HttpResponse.json({ memberships })),
  );
  localStorage.setItem(activeShopKey, 'selected');
  await signIn(credentials);
  const { result } = renderHookWithProviders(() => useShopMemberships(user.id));
  await waitFor(() => expect(result.current.activeShopId).toBe('selected'));

  memberships = [];
  await act(() => result.current.reload());
  await waitFor(() => expect(localStorage.getItem(activeShopKey)).toBeNull());
  expect(result.current.activeShopId).toBeNull();
});

it('keeps cached shops available offline only within the authenticated account', async () => {
  const shop = buildShop({ id: 'cached' });
  localStorage.setItem(`neuton.memberships:${user.id}`, JSON.stringify([
    { shopId: shop.id, shops: shop, role: 'owner' },
  ]));
  server.use(
    http.post(apiPath('/auth/signin'), () => HttpResponse.json({ token, user })),
    http.get(apiPath('/session'), () => HttpResponse.error()),
  );
  const { result } = renderHookWithProviders(() => ({
    own: useShopMemberships(user.id),
    other: useShopMemberships('u2'),
  }));
  expect(result.current.own.activeShopId).toBeNull();
  await act(() => signIn(credentials));
  await waitFor(() => expect(result.current.own.activeShopId).toBe(shop.id));
  expect(result.current.other.memberships).toEqual([]);
});
