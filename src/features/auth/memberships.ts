import { useCallback } from "react";
import { useAuth } from "./useAuth";
import type { ShopMembershipDto } from "./types";

export function useShopMemberships(userId: string | undefined) {
  const auth = useAuth();
  const memberships =
    (auth.status === "authenticated" || auth.status === "offline") &&
    userId === auth.user?.id
      ? auth.session!.memberships
      : [];
  const refresh = auth.refresh;
  const reload = useCallback(async () => {
    await refresh();
  }, [refresh]);
  return {
    memberships,
    activeShopId: auth.activeShopId,
    loading: auth.loading,
    error: auth.error,
    setActiveShopId: auth.setActiveShopId,
    reload,
  };
}

export function useCurrentShop(
  memberships: ShopMembershipDto[],
  activeShopId: string | null,
) {
  return memberships.find((row) => row.shopId === activeShopId)?.shop ?? null;
}
