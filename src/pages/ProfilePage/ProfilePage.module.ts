import { useAuth, useCurrentShop, useShopMemberships } from "@/features/auth";
import { useCreateShop } from "@/features/shops/shopsApi";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
type Tab = "me" | "shop";
export function useProfilePage() {
  const { user, identity, logout } = useAuth();

  const { memberships, activeShopId, setActiveShopId, reload } =
    useShopMemberships(user?.id);

  const activeShop = useCurrentShop(memberships, activeShopId);

  const [tab, setTab] = useState<Tab>("me");

  const [notice, setNotice] = useState<string | null>(null);

  const navigate = useNavigate();
  const signOut = async () => {
    try {
      await logout();
      navigate("/signin", { replace: true });
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Could not sign out.");
    }
  };

  const createShopMutation = useCreateShop(identity);

  const createShop = async (name: string) => {
    if (!identity || createShopMutation.isPending || name.trim().length < 2) {
      return;
    }
    setNotice(null);
    try {
      const { shop } = await createShopMutation.mutateAsync(name.trim());
      // Memberships are an external hook, not a query we invalidate, so the
      // new membership has to be pulled in by hand before switching to it.
      await reload();
      setActiveShopId(shop.id);
      setNotice(`${shop.name} is ready.`);
    } catch (cause) {
      setNotice(
        cause instanceof Error ? cause.message : "Could not create the shop.",
      );
    }
  };
  const createShopPending = createShopMutation.isPending;
  const role = memberships.find((m) => m.shopId === activeShopId)?.role;
  const handleSelectShop = (shopId: string, name: string) => {
    setActiveShopId(shopId);
    setNotice(`Switched to ${name}.`);
  };
  const handleSaved = () => setNotice("Shop settings saved.");
  return {
    role,
    handleSelectShop,
    handleSaved,
    user,
    identity,
    memberships,
    activeShopId,
    activeShop,
    tab,
    setTab,
    notice,
    setNotice,
    signOut,
    createShop,
    createShopPending,
  };
}
export type ProfilePageModel = ReturnType<typeof useProfilePage>;
