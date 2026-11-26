import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export type InviteRole = "member" | "admin";

export type ShopAccountMatch = {
  id: string;
  fullName: string | null;
  email: string;
  eligibility: "eligible" | "member" | "pending";
};

type AccountPage = { accounts: ShopAccountMatch[]; page: number; pageCount: number };

export function useShopAccountSearch(userId: string, shopId: string, query: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: ["shop-team-account-search", userId, shopId, query, page],
    queryFn: ({ signal }) => apiFetch<AccountPage>("/shop/team/accounts/search", {
      method: "POST", body: { query, page }, userId, shopId, signal,
    }),
    enabled,
    gcTime: 0,
    retry: false,
  });
}
