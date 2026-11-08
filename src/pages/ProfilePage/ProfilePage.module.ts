import {
  signOut as clearSession,
  useAuth,
  useCurrentShop,
  useShopMemberships,
} from "@/features/auth/auth";
import { useCreateShop } from "@/features/shops/shopsApi";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
type Tab = "me" | "shop";
export function useProfilePage() {
  const { user, userId, message: sessionNotice } = useAuth();

  const { memberships, activeShopId, setActiveShopId, reload } =
    useShopMemberships(user?.id);

  const activeShop = useCurrentShop(memberships, activeShopId);

  const [tab, setTab] = useState<Tab>("me");

  const [notice, setNotice] = useState<string | null>(null);

  const navigate = useNavigate();
  const signOut = async (everywhere = false) => {
    try {
      await clearSession(everywhere);
      navigate("/signin", { replace: true });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Sign-out could not be confirmed.');
    }
  };

  const createShopMutation = useCreateShop(userId);

  const createShop = async (name: string) => {
    if (!userId || createShopMutation.isPending || name.trim().length < 2)
      return;
    setNotice(null);
    try {
      const { shop } = await createShopMutation.mutateAsync(name.trim());
      // Refresh the membership list before selecting the new shop.
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
    userId,
    memberships,
    activeShopId,
    activeShop,
    tab,
    setTab,
    notice,
    sessionNotice,
    setNotice,
    signOut,
    createShop,
    createShopPending,
  };
}
export type ProfilePageModel = ReturnType<typeof useProfilePage>;
