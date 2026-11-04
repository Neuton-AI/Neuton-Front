import { useAuth } from "@/features/auth";
import { useLocation } from "react-router-dom";
export function useRootRedirect() {
  return useAuth();
}
export function useRequireAuth() {
  return { ...useAuth(), from: useLocation().pathname };
}
