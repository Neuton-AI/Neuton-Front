import { useAuth, useShopMemberships } from "@/features/auth/auth";
import {
  invitationResponseMessage,
  useIncomingInvitations,
  useRespondToShopInvitation,
  type IncomingInvitation,
  type InvitationDecision,
} from "@/features/shops/shopInvitationsApi";
import { requestScopeSignal } from "@/lib/api";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export function useShopInvitesAccount() {
  return useAuth().userId;
}

export function useShopInvitesPage(userId: string) {
  const navigate = useNavigate();
  const inbox = useIncomingInvitations(userId);
  const response = useRespondToShopInvitation(userId);
  const { memberships, reload, setActiveShopId } = useShopMemberships(userId);
  const busy = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [action, setAction] = useState<{ id: string; decision: InvitationDecision }>();
  const [notice, setNotice] = useState<{ tone: "success" | "info"; message: string }>();
  const [accepted, setAccepted] = useState<{ shopId: string; shopName: string }[]>([]);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  async function respond(invitation: IncomingInvitation, decision: InvitationDecision) {
    if (busy.current) return;
    busy.current = true;
    setAction({ id: invitation.id, decision });
    setNotice(undefined);
    let scope: AbortSignal | undefined;
    try {
      scope = requestScopeSignal(userId);
      const result = await response.respond({ id: invitation.id, decision });
      if (scope?.aborted) return;
      if (result) {
        await reload();
        if (scope?.aborted) return;
        setAccepted((current) => [...current, { shopId: result.shopId, shopName: invitation.shopName }]);
      } else {
        setNotice({ tone: "success", message: "Invitation declined." });
      }
    } catch (error) {
      if (scope?.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
      // Refresh memberships after a failed accept as well. Another session or a lost response can hide a completed write.
      if (decision === "accept") await reload();
      if (scope?.aborted) return;
      const stillPending = response.isStillPending(invitation.id);
      setNotice({ tone: "info", message: invitationResponseMessage(error, stillPending) });
    } finally {
      busy.current = false;
      setAction(undefined);
      if (document.activeElement === document.body) headingRef.current?.focus();
    }
  }

  async function openShop(shopId: string) {
    if (opening) return;
    if (memberships.some((membership) => membership.shopId === shopId)) {
      setActiveShopId(shopId);
      navigate("/dashboard");
      return;
    }
    setOpening(true);
    try {
      await reload();
    } finally {
      setOpening(false);
    }
  }

  return { inbox, respond, action, notice, accepted, openShop, opening, memberships, headingRef };
}
