import { ApiError, apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type InviteRole = "member" | "admin";

export type ShopAccountMatch = {
  id: string;
  fullName: string | null;
  email: string;
  eligibility: "eligible" | "member" | "pending";
};

type AccountIdentity = Pick<ShopAccountMatch, "fullName" | "email">;
export type ShopTeamMember = AccountIdentity & { id: string; role: InviteRole };
export type OutgoingInvitation = AccountIdentity & {
  id: string;
  recipientId: string;
  offeredRole: InviteRole;
  createdAt: string;
};

type AccountPage = { accounts: ShopAccountMatch[]; page: number; pageCount: number };
const teamPath = "/shop/team";
const teamKey = (userId: string, shopId: string) => ["shop-team", userId, shopId] as const;

export function isStaleTeamAction(error: unknown) {
  return error instanceof ApiError && (error.status === 404 || error.status === 409);
}

export function useShopTeamMembers(userId: string, shopId: string) {
  return useQuery({
    queryKey: [...teamKey(userId, shopId), "members"],
    queryFn: ({ signal }) => apiFetch<{ members: ShopTeamMember[] }>(`${teamPath}/members`, { userId, shopId, signal }),
    gcTime: 0,
  });
}

export function useChangeShopTeamRole(userId: string, shopId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: InviteRole }) =>
      apiFetch<void>(`${teamPath}/members/${encodeURIComponent(id)}`, { method: "PATCH", userId, shopId, body: { role } }),
    onSettled: () => client.invalidateQueries({ queryKey: teamKey(userId, shopId) }),
  });
}

export function useRemoveShopTeamMember(userId: string, shopId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`${teamPath}/members/${encodeURIComponent(id)}`, {
      method: "DELETE", userId, shopId,
    }),
    onSettled: () => client.invalidateQueries({ queryKey: teamKey(userId, shopId) }),
  });
}

export function useOutgoingInvitations(userId: string, shopId: string) {
  return useQuery({
    queryKey: [...teamKey(userId, shopId), "invitations"],
    queryFn: ({ signal }) => apiFetch<{ invitations: OutgoingInvitation[] }>(`${teamPath}/invitations`, { userId, shopId, signal }),
    gcTime: 0,
  });
}

export function useSendShopInvitation(userId: string, shopId: string) {
  const client = useQueryClient();
  return async (recipientId: string, offeredRole: InviteRole) => {
    try {
      const { invitation } = await apiFetch<{ invitation: OutgoingInvitation }>(`${teamPath}/invitations`, {
        method: "POST", userId, shopId, body: { recipientId, offeredRole },
      });
      return invitation;
    } finally {
      // Reconcile a committed write even if its response was lost.
      void client.invalidateQueries({ queryKey: teamKey(userId, shopId) });
    }
  };
}

export function useCancelShopInvitation(userId: string, shopId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`${teamPath}/invitations/${encodeURIComponent(id)}`, {
      method: "DELETE", userId, shopId,
    }),
    onSettled: () => client.invalidateQueries({ queryKey: teamKey(userId, shopId) }),
  });
}

export function useShopAccountSearch(userId: string, shopId: string, query: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: [...teamKey(userId, shopId), "account-search", query, page],
    queryFn: ({ signal }) => apiFetch<AccountPage>(`${teamPath}/accounts/search`, {
      method: "POST", body: { query, page }, userId, shopId, signal,
    }),
    enabled,
    gcTime: 0,
    retry: false,
  });
}
