import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ShopMembership } from '@/features/shops/types';
import { logoutCleanup } from '@/features/sync/store';
import { ApiError, apiFetch, requestScopeSignal, resetCsrf, setRequestSession, setRequestShop } from '@/lib/api';

type Credentials = { email: string; password: string };
export type SessionMetadata = {
  id: string;
  lastActivityAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  nextRenewalAt: string;
};
export type DeviceSession = SessionMetadata & { deviceLabel: string | null; createdAt: string; current: boolean };
type Session = {
  user: { id: string; email: string; fullName: string | null; avatarUrl: string | null };
  memberships: { shop: ShopMembership['shops']; role: ShopMembership['role'] }[];
  session: SessionMetadata;
};
type AuthSnapshot = {
  status: 'loading' | 'authenticated' | 'anonymous' | 'unavailable';
  session: Session | null;
  message?: string;
};

const activeShopKey = 'neuton.activeShopId';
const listeners = new Set<() => void>();
const emptyMemberships: ShopMembership[] = [];
const unavailableMessage = 'Session unavailable. Check your connection and try again.';
const channel = typeof window.BroadcastChannel === 'function' ? new BroadcastChannel('neuton-session') : null;
let snapshot: AuthSnapshot = { status: 'loading', session: null };
let revision = 0;
let restoring: { revision: number; result: Promise<void> } | undefined;
let renewal: Promise<void> | undefined;
let changingPassword = false;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
let logoutUnconfirmed: string | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notify() {
  for (const listener of listeners) listener();
}

function readActiveShopId() {
  try { return localStorage.getItem(activeShopKey); } catch { return null; }
}

function storeActiveShopId(id: string | null) {
  setRequestShop(id);
  if (id === readActiveShopId()) return;
  try {
    if (id) localStorage.setItem(activeShopKey, id);
    else localStorage.removeItem(activeShopKey);
  } catch { /* The API scope still changes when storage is unavailable. */ }
  notify();
}

function sessionFailure(status: number) {
  // In-flight requests can still refer to the old session while its replacement is being confirmed.
  if (changingPassword) return;
  if (status === 401) update({ status: 'anonymous', session: null });
  else update({ status: 'unavailable', session: null, message: unavailableMessage });
}

function update(next: AuthSnapshot) {
  const previous = snapshot.session;
  const changed = previous?.session.id !== next.session?.session.id;
  snapshot = next;
  if (changed) {
    revision++;
    setRequestSession(next.session?.user.id ?? null, next.session?.session.id ?? null, sessionFailure);
    setRequestShop(null);
    if (previous) window.dispatchEvent(new Event('neuton-account-change'));
  }
  if (next.session) {
    const selected = readActiveShopId();
    const memberships = next.session.memberships;
    storeActiveShopId(memberships.some(({ shop }) => shop.id === selected) ? selected : (memberships[0]?.shop.id ?? null));
  }
  clearTimeout(expiryTimer);
  if (next.session) {
    const expires = Math.min(Date.parse(next.session.session.idleExpiresAt), Date.parse(next.session.session.absoluteExpiresAt));
    expiryTimer = setTimeout(() => {
      update({ status: 'loading', session: null });
      void restoreSession();
    }, Math.max(0, expires - Date.now()));
  }
  notify();
}

export function restoreSession() {
  const started = revision;
  if (restoring?.revision === started) return restoring.result;
  const result = (async () => {
    try {
      const session = await apiFetch<Session>('/session');
      if (!session?.user?.id || !session.session?.id || !Array.isArray(session.memberships) ||
        !Number.isFinite(Date.parse(session.session.idleExpiresAt)) || !Number.isFinite(Date.parse(session.session.absoluteExpiresAt))) {
        throw new Error('Invalid session response');
      }
      if (started === revision) update({ status: 'authenticated', session, message: logoutUnconfirmed });
    } catch (error) {
      if (started !== revision) return;
      if (error instanceof ApiError && error.status === 401) {
        if (logoutUnconfirmed) {
          update({ status: 'unavailable', session: null, message: `This browser is signed out. ${logoutUnconfirmed}` });
        } else {
          update({ status: 'anonymous', session: null });
        }
      } else {
        update({ status: 'unavailable', session: null, message: logoutUnconfirmed ?? unavailableMessage });
      }
    }
  })();
  restoring = { revision: started, result };
  void result.finally(() => { if (restoring?.result === result) restoring = undefined; });
  return result;
}

async function authenticate(path: string, body: Credentials & { fullName?: string }) {
  const started = ++revision;
  await apiFetch(path, { method: 'POST', body });
  if (started !== revision) return;
  logoutUnconfirmed = undefined;
  resetCsrf();
  await restoreSession();
  if (!snapshot.session) throw new Error(unavailableMessage);
  channel?.postMessage('changed');
}

export const signIn = (credentials: Credentials) => authenticate('/auth/signin', credentials);
export const signUp = (credentials: Credentials & { fullName: string }) => authenticate('/auth/signup', credentials);

export async function changePassword(body: { currentPassword: string; newPassword: string }) {
  const current = snapshot.session;
  if (!current || changingPassword) return 'unconfirmed';

  changingPassword = true;
  const started = ++revision;
  try {
    // A renewal response can set the old cookie. Let it finish before asking for a new one.
    await renewal;
    if (started !== revision) return 'unconfirmed';

    let confirmed = false;
    try {
      const result = await apiFetch<{ ok: boolean }>('/profile/password', {
        method: 'POST', body, sessionId: current.session.id, signal: requestScopeSignal(current.user.id),
      });
      confirmed = result?.ok === true;
    } catch (error) {
      if (error instanceof ApiError && [400, 429, 503].includes(error.status)) throw error;
    }

    if (started !== revision) return 'unconfirmed';
    // Discard any session reads or proofs that started before the password response.
    revision++;
    resetCsrf();
    await restoreSession();
    const restored = snapshot.session;
    const replaced = restored?.user.id === current.user.id && restored.session.id !== current.session.id;
    if (confirmed || replaced) channel?.postMessage('changed');
    return confirmed && replaced ? 'changed' : 'unconfirmed';
  } finally {
    changingPassword = false;
  }
}

export async function signOut(everywhere = false) {
  const started = ++revision;
  const current = snapshot.session;
  try {
    await apiFetch(everywhere ? '/auth/logout-all' : '/auth/logout', { method: 'POST', sessionId: current?.session.id });
    if (started !== revision) return;
    logoutUnconfirmed = undefined;
    update({ status: 'anonymous', session: null });
    if (current) void logoutCleanup(current.user.id).catch(() => undefined);
    channel?.postMessage('changed');
  } catch (error) {
    if (started !== revision) return;
    logoutUnconfirmed = everywhere ? 'Sign-out everywhere could not be confirmed.' : 'Sign-out could not be confirmed.';
    update({ status: 'unavailable', session: null, message: logoutUnconfirmed });
    throw error;
  }
}

export async function listSessions(signal?: AbortSignal) {
  return (await apiFetch<{ sessions: DeviceSession[] }>('/auth/sessions', { userId: snapshot.session?.user.id, signal })).sessions;
}

export async function endSession(id: string) {
  const current = snapshot.session;
  if (!current) return;
  await apiFetch('/auth/sessions/' + encodeURIComponent(id), { method: 'DELETE', userId: current.user.id });
  if (snapshot.session?.session.id !== current.session.id) return;
  if (id === current.session.id) {
    update({ status: 'anonymous', session: null });
    void logoutCleanup(current.user.id).catch(() => undefined);
  }
  channel?.postMessage('changed');
}

export function renewOnInteraction() {
  const current = snapshot.session;
  if (!current || renewal || changingPassword || document.visibilityState !== 'visible' ||
    Date.now() < Date.parse(current.session.nextRenewalAt)) {
    return;
  }
  renewal = apiFetch<SessionMetadata>('/auth/session/renew', { method: 'POST', userId: current.user.id })
    .then((session) => {
      if (snapshot.session?.session.id === current.session.id && session.id === current.session.id) {
        update({ status: 'authenticated', session: { ...snapshot.session, session } });
      }
    })
    .catch(() => undefined)
    .finally(() => { renewal = undefined; });
}

channel?.addEventListener('message', () => {
  revision++;
  resetCsrf();
  update({ status: 'loading', session: null });
  void restoreSession();
});
for (const event of ['pointerdown', 'keydown', 'touchstart']) {
  window.addEventListener(event, (interaction) => {
    if (interaction.isTrusted) renewOnInteraction();
  }, { passive: true });
}
window.addEventListener('online', () => {
  if (snapshot.status === 'unavailable') void restoreSession();
});

export function useAuth() {
  const current = useSyncExternalStore(subscribe, () => snapshot);
  useEffect(() => {
    if (snapshot.status === 'loading') void restoreSession();
  }, []);
  return {
    session: current.session,
    loading: current.status === 'loading',
    unavailable: current.status === 'unavailable',
    message: current.message,
    user: current.session?.user ?? null,
    userId: current.session?.user.id ?? null,
    sessionId: current.session?.session.id ?? null,
  };
}

export function useShopMemberships(userId: string | undefined) {
  const { session, user, loading, message } = useAuth();
  const selected = useSyncExternalStore(subscribe, readActiveShopId);
  const memberships = useMemo(() => {
    if (!session || user?.id !== userId) return emptyMemberships;
    return session.memberships.map(({ shop, role }) => ({ shopId: shop.id, shops: shop, role }));
  }, [session, user?.id, userId]);
  const fallbackId = memberships[0]?.shopId ?? null;
  const activeShopId = memberships.some((row) => row.shopId === selected) ? selected : fallbackId;
  return {
    memberships, activeShopId, loading, error: message ?? null,
    setActiveShopId: storeActiveShopId, reload: restoreSession,
  };
}

export function useCurrentShop(memberships: ShopMembership[], activeShopId: string | null) {
  return useMemo(
    () => memberships.find((row) => row.shopId === activeShopId)?.shops ?? null,
    [memberships, activeShopId],
  );
}
