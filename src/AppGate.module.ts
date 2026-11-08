import { restoreSession, useAuth } from "@/features/auth/auth";
import { useLocation } from "react-router-dom";

export function checkSession() { void restoreSession(); }

export function useRootRedirect() {
  const { session, loading, unavailable, message } = useAuth();
  return { session, loading, unavailable, message };
}

export function useRequireAuth() {
  const { session, loading, unavailable, message } = useAuth();
  const location = useLocation();
  return { session, loading, unavailable, message, from: location.pathname };
}
