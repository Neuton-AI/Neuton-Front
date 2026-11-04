import { FullPageLoader } from "@/components/feedback";
import { LandingPage } from "@/pages/LandingPage/LandingPage";
import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useRequireAuth, useRootRedirect } from "./AppGate.module";
import { useAuth } from "@/features/auth";
function SessionUnavailable() {
  const { error, refresh, logout } = useAuth();
  return (
    <main className="shell p-6" aria-labelledby="session-title">
      <h1 id="session-title">Session unavailable</h1>
      <p role="alert">{error}</p>
      <button
        type="button"
        onClick={() => {
          void refresh().catch(() => undefined);
        }}
      >
        Try again
      </button>
      <button
        type="button"
        onClick={() => {
          void logout().catch(() => undefined);
        }}
      >
        Sign out
      </button>
    </main>
  );
}
export function RootRedirect() {
  const auth = useRootRedirect();
  if (auth.loading) return <FullPageLoader />;
  if (auth.status === "unavailable") return <SessionUnavailable />;
  if (auth.status === "pending-email") {
    return <Navigate to="/auth/confirm" replace />;
  }
  if (auth.status === "authenticated" || auth.status === "offline") {
    return (
      <Navigate
        to={auth.session?.memberships.length ? "/dashboard" : "/profile"}
        replace
      />
    );
  }
  return <LandingPage />;
}
export function RequireAuth({ children }: { children: ReactElement }) {
  const auth = useRequireAuth();
  if (auth.loading) return <FullPageLoader />;
  if (auth.status === "unavailable") return <SessionUnavailable />;
  if (auth.status === "pending-email") {
    return <Navigate to="/auth/confirm" replace />;
  }
  if (auth.status !== "authenticated" && auth.status !== "offline") {
    return <Navigate to="/signin" replace state={{ from: auth.from }} />;
  }
  if (!auth.session?.memberships.length && auth.from !== "/profile") {
    return <Navigate to="/profile" replace />;
  }
  return children;
}
