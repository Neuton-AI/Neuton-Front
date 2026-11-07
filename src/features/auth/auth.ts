import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ShopMembership } from '@/features/shops/types';
import { logoutCleanup } from '@/features/sync/store';
import { ApiError, apiFetch } from '@/lib/api';

type Credentials = { email: string; password: string };
type Session = {
  token: string;
  user: { id: string; email: string; fullName: string | null; avatarUrl: string | null };
};
type SessionMembership = { shop: ShopMembership['shops']; role: ShopMembership['role'] };

const activeShopKey = 'neuton.activeShopId';
const membershipsKey = (userId: string) => `neuton.memberships:${userId}`;
const emptyMemberships: ShopMembership[] = [];

let session: Session | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notify() {
  for (const listener of listeners) listener();
}

function changeSession(next: Session | null) {
  const previous = session;
  session = next;
  if (previous && previous.user.id !== next?.user.id) {
    try {
      localStorage.removeItem(membershipsKey(previous.user.id));
    } catch { /* The optional cache cannot prevent sign-out. */ }
    window.dispatchEvent(new Event('neuton-account-change'));
    void logoutCleanup(previous.user.id).catch(() => undefined);
  }
  notify();
}

export function signOut() {
  clearTimeout(expiryTimer);
  changeSession(null);
}

async function authenticate(path: string, body: Credentials & { fullName?: string }) {
  const next = await apiFetch<Session>(path, { method: 'POST', body });
  // The browser uses the expiry only to end its local session. The API verifies the JWT.
  const payload = next.token.split('.')[1];
  const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
  if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp)) {
    throw new Error('The server returned an invalid session.');
  }
  const remainingMs = claims.exp * 1000 - Date.now();
  if (remainingMs <= 0) throw new Error('Session expired. Sign in again.');
  clearTimeout(expiryTimer);
  changeSession(next);
  expiryTimer = setTimeout(signOut, remainingMs);
}

export function signIn(credentials: Credentials) {
  return authenticate('/auth/signin', credentials);
}

export function signUp(credentials: Credentials & { fullName: string }) {
  return authenticate('/auth/signup', credentials);
}

export function useAuth() {
  const current = useSyncExternalStore(subscribe, () => session);
  return { session: current, loading: false, user: current?.user ?? null, token: current?.token ?? null };
}

function readMemberships(userId: string): ShopMembership[] | undefined {
  try {
    const cached = localStorage.getItem(membershipsKey(userId));
    if (!cached) return undefined;
    const parsed: unknown = JSON.parse(cached);
    return Array.isArray(parsed) ? parsed as ShopMembership[] : undefined;
  } catch {
    return undefined;
  }
}

function readActiveShopId() {
  try {
    return localStorage.getItem(activeShopKey);
  } catch {
    return null;
  }
}

function storeActiveShopId(shopId: string | null) {
  if (shopId === readActiveShopId()) return;
  try {
    if (shopId) {
      localStorage.setItem(activeShopKey, shopId);
    } else {
      localStorage.removeItem(activeShopKey);
    }
  } catch { return; }
  notify();
}

export function useShopMemberships(userId: string | undefined) {
  const { token, user } = useAuth();
  const authenticated = Boolean(token && userId && user?.id === userId);
  const selected = useSyncExternalStore(subscribe, readActiveShopId);
  const query = useQuery({
    queryKey: ['memberships', authenticated ? userId : undefined],
    enabled: authenticated,
    initialData: () => (authenticated && userId ? readMemberships(userId) : undefined),
    initialDataUpdatedAt: 0,
    queryFn: async ({ signal }) => {
      if (!authenticated || !token || !userId) return emptyMemberships;
      try {
        const data = await apiFetch<{ memberships: SessionMembership[] }>('/session', { token, signal });
        const rows = data.memberships.map(({ shop, role }) => ({ shopId: shop.id, shops: shop, role }));
        if (!signal.aborted && session?.token === token) {
          try {
            localStorage.setItem(membershipsKey(userId), JSON.stringify(rows));
          } catch { /* The optional offline cache must not block online access. */ }
        }
        return rows;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401 && session?.token === token) {
          signOut();
        }
        throw error;
      }
    },
  });

  const memberships = authenticated ? (query.data ?? emptyMemberships) : emptyMemberships;
  const fallbackId = memberships[0]?.shopId ?? null;
  const activeShopId = memberships.some((row) => row.shopId === selected) ? selected : fallbackId;
  useEffect(() => {
    if (authenticated && query.data) storeActiveShopId(activeShopId);
  }, [activeShopId, authenticated, query.data, selected]);

  const { refetch } = query;
  const reload = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    memberships,
    activeShopId,
    loading: authenticated && query.isPending,
    error: query.error?.message ?? null,
    setActiveShopId: storeActiveShopId,
    reload,
  };
}

export function useCurrentShop(memberships: ShopMembership[], activeShopId: string | null) {
  return useMemo(
    () => memberships.find((row) => row.shopId === activeShopId)?.shops ?? null,
    [memberships, activeShopId],
  );
}
