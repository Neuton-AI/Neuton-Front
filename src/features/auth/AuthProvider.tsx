import { logoutCleanup } from "@/features/sync/store";
import { useQueryClient } from "@tanstack/react-query";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api-error";
import { setApiIdentity, type AuthIdentity } from "@/lib/api-context";
import { authClient } from "./client";
import { AuthContext } from "./context";
import { resetCsrf } from "./csrf";
import type { AuthStatus, SessionDto } from "./types";
import { identityPartition } from "./environment";
import { isAuthTabEvent } from "./tab-events";

type AuthState = {
  status: AuthStatus;
  session: SessionDto | null;
  error: string | null;
  activeShopId: string | null;
  generation: number;
};
const preferenceKey = (session: SessionDto) =>
  `${identityPartition({ environment: session.environment, userId: session.user.id })}:activeShop`;
function selectShop(session: SessionDto): string | null {
  let preferred: string | null = null;
  try {
    preferred = localStorage.getItem(preferenceKey(session));
  } catch {
    /* Selection remains available without storage. */
  }
  const matched = session.memberships.find(
    (row) => row.shopId === preferred,
  )?.shopId;
  const selected = matched ?? session.memberships[0]?.shopId;
  try {
    if (selected) localStorage.setItem(preferenceKey(session), selected);
    else {
      localStorage.removeItem(preferenceKey(session));
    }
  } catch {
    /* Selection remains in memory. */
  }
  return selected ?? null;
}

function sessionIdentity(
  session: SessionDto,
  generation: number,
  shopId: string | null,
  offline = false,
): AuthIdentity {
  return {
    environment: session.environment,
    userId: session.user.id,
    sessionId: session.session.id,
    generation,
    shopId,
    offline,
    expiresAt: Math.min(
      Date.parse(session.session.idleExpiresAt),
      Date.parse(session.session.absoluteExpiresAt),
    ),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    status: "loading",
    session: null,
    error: null,
    activeShopId: null,
    generation: 0,
  });
  const current = useRef(state);
  const generation = useRef(0);
  const identityKey = useRef<string | null>(null);
  const establishedIdentity = useRef<AuthIdentity | null>(null);
  const lastUserId = useRef<string | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const operation = useRef(false);
  const request = useRef<AbortController | null>(null);

  const apply = useCallback(
    async (
      session: SessionDto | null,
      status: AuthStatus,
      error: string | null = null,
      expectedGeneration = generation.current,
    ) => {
      if (generation.current !== expectedGeneration) return;
      const previous = current.current;
      const key =
        session?.user.status === "active"
          ? identityPartition({
              environment: session.environment,
              userId: session.user.id,
            })
          : null;
      let activeShopId: string | null = null;
      if (session?.user.status === "active") {
        activeShopId =
          status === "offline" ? previous.activeShopId : selectShop(session);
      }
      if (
        identityKey.current !== key ||
        previous.activeShopId !== activeShopId
      ) {
        setApiIdentity(null);
        window.dispatchEvent(new Event("neuton-account-change"));
        await queryClient.cancelQueries();
        if (generation.current !== expectedGeneration) return;
        queryClient.clear();
        if (establishedIdentity.current && identityKey.current !== key) {
          await logoutCleanup(establishedIdentity.current).catch(
            () => undefined,
          );
        }
      }
      if (generation.current !== expectedGeneration) return;
      if (
        previous.session?.session.id !== session?.session.id ||
        identityKey.current !== key ||
        previous.activeShopId !== activeShopId
      ) {
        resetCsrf();
      }
      identityKey.current = key;
      establishedIdentity.current =
        key && session
          ? {
              environment: session.environment,
              userId: session.user.id,
            }
          : null;
      if (session) lastUserId.current = session.user.id;
      const next: AuthState = {
        session,
        status,
        error,
        activeShopId,
        generation: expectedGeneration,
      };
      current.current = next;
      setApiIdentity(
        key && session
          ? sessionIdentity(
              session,
              expectedGeneration,
              activeShopId,
              status === "offline",
            )
          : null,
      );
      setState(next);
    },
    [queryClient],
  );

  const refresh = useCallback(async (): Promise<SessionDto | null> => {
    const previous = current.current;
    const expected = ++generation.current;
    setApiIdentity(null);
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const session = await authClient.session(controller.signal);
      if (generation.current !== expected) return null;
      const status =
        session.user.status === "active" ? "authenticated" : "pending-email";
      await apply(session, status, null, expected);
      return session;
    } catch (error) {
      if (generation.current !== expected) return null;
      if (error instanceof ApiError && error.status === 401) {
        await apply(null, "anonymous", null, expected);
        return null;
      }
      if (
        previous.session &&
        (previous.status === "authenticated" ||
          previous.status === "offline") &&
        (!navigator.onLine || (error instanceof ApiError && error.status === 0))
      ) {
        await apply(
          previous.session,
          "offline",
          "Connection unavailable. Your saved work stays on this device.",
          expected,
        );
        return previous.session;
      }
      const message = navigator.onLine
        ? "Unable to verify your session. Please try again."
        : "Connect to the internet to verify your session.";
      await apply(null, "unavailable", message, expected);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }, [apply]);

  const begin = useCallback(() => {
    generation.current += 1;
    request.current?.abort();
    operation.current = true;
    setApiIdentity(null);
    resetCsrf();
    void queryClient.cancelQueries();
    queryClient.clear();
    window.dispatchEvent(new Event("neuton-account-change"));
    const next: AuthState = {
      status: "loading",
      session: null,
      error: null,
      activeShopId: null,
      generation: generation.current,
    };
    current.current = next;
    setState(next);
  }, [queryClient]);

  const login = useCallback(
    async (email: string, password: string) => {
      begin();
      try {
        await authClient.login(email, password);
        const session = await refresh();
        channel.current?.postMessage("account-changed");
        return session;
      } catch (error) {
        try {
          await refresh();
        } catch {
          /* The unavailable state is set by refresh. */
        }
        throw error;
      } finally {
        operation.current = false;
      }
    },
    [begin, refresh],
  );

  const logout = useCallback(
    async (all = false) => {
      const previousSession = current.current.session;
      const knownUserId = previousSession?.user.id ?? lastUserId.current;
      const expectedUserId = knownUserId ?? undefined;
      begin();
      try {
        if (all) await authClient.logoutAll(expectedUserId);
        else await authClient.logout(expectedUserId);
        if (previousSession) {
          await logoutCleanup({
            environment: previousSession.environment,
            userId: previousSession.user.id,
          }).catch(() => undefined);
        }
        await apply(null, "anonymous");
        channel.current?.postMessage("logged-out");
      } catch (error) {
        await apply(
          null,
          "unavailable",
          "Sign-out was not confirmed. Reconnect and try again.",
        );
        throw error;
      } finally {
        operation.current = false;
      }
    },
    [apply, begin],
  );

  const setActiveShopId = useCallback(
    (shopId: string) => {
      const snapshot = current.current;
      if (
        snapshot.status !== "authenticated" ||
        !snapshot.session?.memberships.some((row) => row.shopId === shopId)
      ) {
        return;
      }
      try {
        localStorage.setItem(preferenceKey(snapshot.session), shopId);
      } catch {
        /* Selection can remain in memory. */
      }
      generation.current += 1;
      setApiIdentity(null);
      resetCsrf();
      window.dispatchEvent(new Event("neuton-account-change"));
      void queryClient.cancelQueries();
      queryClient.clear();
      const next = {
        ...snapshot,
        activeShopId: shopId,
        generation: generation.current,
      };
      current.current = next;
      setApiIdentity(
        sessionIdentity(snapshot.session, next.generation, shopId),
      );
      setState(next);
    },
    [queryClient],
  );

  useEffect(() => {
    setApiIdentity(null);
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("neuton-auth");
      channel.current.onmessage = (event) => {
        if (isAuthTabEvent(event.data) && !operation.current) {
          resetCsrf();
          void refresh().catch(() => undefined);
        }
      };
    }
    const reload = () => {
      if (!operation.current) void refresh().catch(() => undefined);
    };
    window.addEventListener("online", reload);
    window.addEventListener("offline", reload);
    window.addEventListener("focus", reload);
    window.addEventListener("neuton-shop-access-lost", reload);
    void refresh().catch(() => undefined);
    return () => {
      generation.current += 1;
      request.current?.abort();
      channel.current?.close();
      channel.current = null;
      window.removeEventListener("online", reload);
      window.removeEventListener("offline", reload);
      window.removeEventListener("focus", reload);
      window.removeEventListener("neuton-shop-access-lost", reload);
      setApiIdentity(null);
    };
  }, [refresh]);

  useEffect(() => {
    let renewing = false;
    let lastAttempt = 0;
    const foregroundActivity = () => {
      const snapshot = current.current;
      const now = Date.now();
      if (
        operation.current ||
        renewing ||
        document.visibilityState !== "visible" ||
        !navigator.onLine ||
        snapshot.status !== "authenticated" ||
        !snapshot.session ||
        Date.parse(snapshot.session.session.renewAfter) > now ||
        now - lastAttempt < 30_000
      ) {
        return;
      }
      const expected = generation.current;
      renewing = true;
      lastAttempt = now;
      const renew = async () => {
        if (
          expected !== generation.current ||
          document.visibilityState !== "visible"
        ) {
          return;
        }
        const authoritative = await authClient.session();
        if (expected !== generation.current) return;
        if (
          authoritative.user.id !== snapshot.session!.user.id ||
          authoritative.session.id !== snapshot.session!.session.id
        ) {
          await refresh();
          return;
        }
        if (Date.parse(authoritative.session.renewAfter) > Date.now()) return;
        await authClient.renew(
          sessionIdentity(
            snapshot.session!,
            snapshot.generation,
            snapshot.activeShopId,
          ),
        );
      };
      let renewal: Promise<unknown>;
      if (navigator.locks) {
        renewal = navigator.locks.request(
          "neuton-session-renewal",
          { ifAvailable: true },
          (lock) => {
            if (lock) return renew();
          },
        );
      } else renewal = renew();
      void renewal
        .then(() => {
          if (expected === generation.current) return refresh();
        })
        .catch(() => {
          if (expected === generation.current) {
            void refresh().catch(() => undefined);
          }
        })
        .finally(() => {
          renewing = false;
        });
    };
    window.addEventListener("pointerdown", foregroundActivity);
    window.addEventListener("keydown", foregroundActivity);
    return () => {
      window.removeEventListener("pointerdown", foregroundActivity);
      window.removeEventListener("keydown", foregroundActivity);
    };
  }, [refresh]);

  useEffect(() => {
    if (!state.session || !["authenticated", "offline"].includes(state.status)) {
      return;
    }
    const expiresAt = Math.min(
      Date.parse(state.session.session.idleExpiresAt),
      Date.parse(state.session.session.absoluteExpiresAt),
    );
    const expected = generation.current;
    let timer: ReturnType<typeof setTimeout>;
    const checkExpiry = () => {
      if (expected !== generation.current) return;
      const remaining = expiresAt - Date.now();
      if (remaining > 0) {
        timer = setTimeout(checkExpiry, Math.min(remaining, 2_147_483_647));
        return;
      }
      generation.current += 1;
      setApiIdentity(null);
      resetCsrf();
      void apply(
        null,
        "anonymous",
        "Session expired. Sign in again to resume your saved work.",
      );
    };
    checkExpiry();
    return () => clearTimeout(timer);
  }, [state.session, state.status, state.generation, apply]);

  const identity = useMemo(
    () =>
      (state.status === "authenticated" || state.status === "offline") &&
      state.session
        ? sessionIdentity(
            state.session,
            state.generation,
            state.activeShopId,
            state.status === "offline",
          )
        : null,
    [state.status, state.session, state.generation, state.activeShopId],
  );
  const value = useMemo(
    () => ({
      ...state,
      identity,
      user: state.session?.user ?? null,
      lastUserId: lastUserId.current,
      loading: state.status === "loading",
      refresh,
      login,
      logout,
      logoutAll: () => logout(true),
      register: authClient.register,
      setActiveShopId,
    }),
    [state, identity, refresh, login, logout, setActiveShopId],
  );
  const boundary = identity
    ? `${identityPartition(identity)}:${state.activeShopId ?? ""}`
    : "locked";
  return (
    <AuthContext.Provider value={value}>
      <Fragment key={boundary}>{children}</Fragment>
    </AuthContext.Provider>
  );
}
