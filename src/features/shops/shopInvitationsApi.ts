import { ApiError, apiFetch } from "@/lib/api";
import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InviteRole } from "./shopTeamApi";

export type IncomingInvitation = {
  id: string;
  shopId: string;
  shopName: string;
  offeredRole: InviteRole;
  createdAt: string;
  readAt: string | null;
};

export type InvitationDecision = "accept" | "decline";
type Inbox = { invitations: IncomingInvitation[] };
type Acceptance = { membership: { shopId: string; role: InviteRole } };
const inboxPath = "/shop-invitations";
const inboxKey = (userId: string | null) => ["shop-invitations", userId] as const;
const readBatchSize = 100;

export function invitationResponseMessage(error: unknown, stillPending: boolean) {
  if (error instanceof ApiError) {
    if (error.status === 404 || (error.status === 409 && !stillPending)) {
      return "This invitation is no longer pending.";
    }
    if (error.status === 409) return "Couldn’t respond to this invitation. Check whether you already have access to the shop.";
  }
  return "Couldn’t confirm your response. Check the updated invitation list before trying again.";
}

export function useIncomingInvitations(userId: string | null) {
  return useQuery({
    queryKey: inboxKey(userId),
    queryFn: userId ? ({ signal }) => apiFetch<Inbox>(inboxPath, { userId, signal }) : skipToken,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useMarkShopInvitationsRead(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      for (let offset = 0; offset < ids.length; offset += readBatchSize) {
        const invitationIds = ids.slice(offset, offset + readBatchSize);
        await apiFetch<void>(`${inboxPath}/read`, { method: "POST", userId, body: { invitationIds } });
      }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: inboxKey(userId) }),
  });
}

export function useRespondToShopInvitation(userId: string) {
  const client = useQueryClient();
  const queryKey = inboxKey(userId);
  const response = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: InvitationDecision }) => {
      const path = `${inboxPath}/${encodeURIComponent(id)}/${decision}`;
      if (decision === "decline") {
        await apiFetch<void>(path, { method: "POST", userId });
        return;
      }
      const result = await apiFetch<Acceptance>(path, { method: "POST", userId });
      if (!result?.membership?.shopId) throw new Error("Missing accepted shop");
      return result.membership;
    },
    retry: false,
    onSuccess: async (_response, { id }) => {
      await client.cancelQueries({ queryKey });
      client.setQueryData<Inbox>(queryKey, (current) => {
        if (!current) return current;
        return { invitations: current.invitations.filter((invitation) => invitation.id !== id) };
      });
    },
    onSettled: () => client.invalidateQueries({ queryKey }),
  });
  return {
    respond: response.mutateAsync,
    isStillPending: (id: string) => Boolean(
      client.getQueryData<Inbox>(queryKey)?.invitations.some((invitation) => invitation.id === id),
    ),
  };
}
