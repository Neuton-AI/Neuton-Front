import { logoutCleanup } from "@/features/sync/store";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api-error";
import { setApiIdentity } from "@/lib/api-context";
import { authClient } from "./client";
import { AuthContext } from "./context";
import { resetCsrf } from "./csrf";
import type { AuthStatus, SessionDto } from "./types";

type AuthState = {
  status: AuthStatus;
  session: SessionDto | null;
  error: string | null;
  activeShopId: string | null;
};
const preferenceKey = (session: SessionDto) =>
  `neuton.activeShop:${session.environment}:${session.user.id}`;
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
    else localStorage.removeItem(preferenceKey(session));
  } catch {
    /* Selection remains in memory. */
  }
  return selected ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    status: "loading",
    session: null,
    error: null,
    activeShopId: null,
  });
  const current = useRef(state);
  const generation = useRef(0);
  const identityKey = useRef<string | null>(null);
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
      const key =
        session?.user.status === "active"
          ? `${session.environment}:${session.user.id}`
          : null;
      if (identityKey.current !== key) {
        setApiIdentity(null);
        window.dispatchEvent(new Event("neuton-account-change"));
        await queryClient.cancelQueries();
        queryClient.clear();
      }
      if (generation.current !== expectedGeneration) return;
      if (current.current.session?.session.id !== session?.session.id) {
        resetCsrf();
      }
      identityKey.current = key;
      if (session) lastUserId.current = session.user.id;
      const next: AuthState = {
        session,
        status,
        error,
        activeShopId:
          session?.user.status === "active" ? selectShop(session) : null,
      };
      current.current = next;
      setApiIdentity(
        key && session
          ? {
              environment: session.environment,
              userId: session.user.id,
              sessionId: session.session.id,
            }
          : null,
      );
      setState(next);
    },
    [queryClient],
  );

  const refresh = useCallback(async (): Promise<SessionDto | null> => {
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
    window.dispatchEvent(new Event("neuton-account-change"));
    const next: AuthState = {
      status: "loading",
      session: null,
      error: null,
      activeShopId: null,
    };
    current.current = next;
    setState(next);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      begin();
      try {
        await authClient.login(email, password);
        const session = await refresh();
        channel.current?.postMessage("reload");
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

  const logout = useCallback(async () => {
    const previousSession = current.current.session;
    const knownUserId = previousSession?.user.id ?? lastUserId.current;
    const expectedUserId = knownUserId ?? undefined;
    begin();
    try {
      await authClient.logout(expectedUserId);
      if (previousSession) {
        await logoutCleanup({
          environment: previousSession.environment,
          userId: previousSession.user.id,
        }).catch(() => undefined);
      }
      await apply(null, "anonymous");
      channel.current?.postMessage("reload");
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
  }, [apply, begin]);

  const setActiveShopId = useCallback((shopId: string) => {
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
    const next = { ...snapshot, activeShopId: shopId };
    current.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    setApiIdentity(null);
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("neuton-auth");
      channel.current.onmessage = (event) => {
        if (event.data === "reload" && !operation.current) {
          resetCsrf();
          void refresh().catch(() => undefined);
        }
      };
    }
    const reload = () => {
      if (!operation.current) void refresh().catch(() => undefined);
    };
    window.addEventListener("focus", reload);
    window.addEventListener("neuton-shop-access-lost", reload);
    void refresh().catch(() => undefined);
    return () => {
      generation.current += 1;
      request.current?.abort();
      channel.current?.close();
      channel.current = null;
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
      void authClient
        .renew({
          environment: snapshot.session.environment,
          userId: snapshot.session.user.id,
          sessionId: snapshot.session.session.id,
        })
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

  const identity = useMemo(
    () =>
      state.status === "authenticated" && state.session
        ? {
            userId: state.session.user.id,
            environment: state.session.environment,
            sessionId: state.session.session.id,
          }
        : null,
    [state.status, state.session],
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
      register: authClient.register,
      setActiveShopId,
    }),
    [state, identity, refresh, login, logout, setActiveShopId],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
