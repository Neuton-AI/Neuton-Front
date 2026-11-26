import {
  isStaleTeamAction, useCancelShopInvitation, useOutgoingInvitations, useSendShopInvitation, useShopTeamMembers,
  type InviteRole,
} from "@/features/shops/shopTeamApi";
import { useEffect, useRef, useState } from "react";

export function useShopTeam(userId: string, shopId: string) {
  const roster = useShopTeamMembers(userId, shopId);
  const outgoing = useOutgoingInvitations(userId, shopId);
  const send = useSendShopInvitation(userId, shopId);
  const cancel = useCancelShopInvitation(userId, shopId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error" | "info"; message: string }>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const invitationsHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  async function invite(recipientId: string, role: InviteRole) {
    const invitation = await send(recipientId, role);
    setNotice({ tone: "success", message: `Invitation sent to ${invitation.fullName?.trim() || invitation.email}` });
  }

  async function cancelInvitation(id: string) {
    if (cancel.isPending) return;
    setNotice(undefined);
    try {
      await cancel.mutateAsync(id);
      setNotice({ tone: "success", message: "Invitation canceled" });
    } catch (error) {
      if (isStaleTeamAction(error)) {
        setNotice({ tone: "info", message: "This invitation is no longer pending." });
      } else {
        setNotice({ tone: "error", message: "Couldn’t cancel the invitation. Check the list and try again." });
      }
    }
    if (document.activeElement === document.body) invitationsHeadingRef.current?.focus();
  }

  return {
    roster, outgoing, pickerOpen, setPickerOpen, invite, cancelInvitation, notice,
    headingRef, invitationsHeadingRef, cancelingId: cancel.isPending ? cancel.variables : undefined,
  };
}
