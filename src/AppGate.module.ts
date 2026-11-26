import { useAuth, useForegroundSessionRefresh, useShopMemberships } from "@/features/auth/auth";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function useRootRedirect() {
  const { session, loading } = useAuth();
  return { session, loading };
}

export function useRequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();
  useForegroundSessionRefresh();
  const userId = session?.user.id;
  const { activeShopId, memberships } = useShopMemberships(userId);
  const previous = useRef<{ userId: string; shopId: string | null }>();
  const oldShopId = previous.current?.userId === userId ? previous.current?.shopId : undefined;
  const shopRemoved = Boolean(oldShopId && activeShopId !== oldShopId &&
    !memberships.some((membership) => membership.shopId === oldShopId));
  const accountView = location.pathname === "/profile/invites" ||
    (location.pathname === "/profile" && new URLSearchParams(location.search).get("tab") !== "shop");
  useEffect(() => {
    if (userId) previous.current = { userId, shopId: activeShopId };
  }, [userId, activeShopId]);
  return {
    session, loading, from: location.pathname + location.search + location.hash,
    leaveRevokedShop: shopRemoved && !accountView && location.pathname !== "/dashboard",
  };
}
