import {
  isStaleTeamAction, useCancelShopInvitation, useChangeShopTeamRole, useOutgoingInvitations,
  useRemoveShopTeamMember, useSendShopInvitation, useShopTeamMembers, type InviteRole, type ShopTeamMember,
} from "@/features/shops/shopTeamApi";
import { useEffect, useRef, useState } from "react";

export function useShopTeam(userId: string, shopId: string) {
  const roster = useShopTeamMembers(userId, shopId);
  const outgoing = useOutgoingInvitations(userId, shopId);
  const send = useSendShopInvitation(userId, shopId);
  const cancel = useCancelShopInvitation(userId, shopId);
  const changeRole = useChangeShopTeamRole(userId, shopId);
  const remove = useRemoveShopTeamMember(userId, shopId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error" | "info"; message: string }>();
  const [removalTarget, setRemovalTarget] = useState<ShopTeamMember>();
  const [removalError, setRemovalError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const membersHeadingRef = useRef<HTMLHeadingElement>(null);
  const invitationsHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusAfterRemoval = useRef(false);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!removalTarget && focusAfterRemoval.current) {
      focusAfterRemoval.current = false;
      membersHeadingRef.current?.focus();
    }
  }, [removalTarget]);

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

  async function updateMemberRole(member: ShopTeamMember, role: InviteRole) {
    if (changeRole.isPending) return;
    setNotice(undefined);
    const name = member.fullName?.trim() || member.email;
    try {
      await changeRole.mutateAsync({ id: member.id, role });
      setNotice({ tone: "success", message: `${name} is now ${role === "admin" ? "an Admin" : "a Member"}.` });
    } catch (error) {
      if (isStaleTeamAction(error)) {
        setNotice({ tone: "info", message: "This teammate is no longer on the team." });
      } else {
        setNotice({ tone: "error", message: "Couldn’t confirm the role change. Check the team and try again." });
      }
    }
    if (document.activeElement === document.body) headingRef.current?.focus();
  }

  function requestRemoval(member: ShopTeamMember) {
    setRemovalError("");
    setRemovalTarget(member);
  }

  function cancelRemoval() {
    if (!remove.isPending) setRemovalTarget(undefined);
  }

  async function confirmRemoval() {
    if (!removalTarget || remove.isPending) return;
    setRemovalError("");
    setNotice(undefined);
    try {
      await remove.mutateAsync(removalTarget.id);
      const name = removalTarget.fullName?.trim() || removalTarget.email;
      setNotice({ tone: "success", message: `Access removed for ${name}.` });
    } catch (error) {
      if (!isStaleTeamAction(error)) {
        setRemovalError("Couldn’t confirm removal. Try again or check the team.");
        return;
      }
      setNotice({ tone: "info", message: "This teammate is no longer on the team." });
    }
    focusAfterRemoval.current = true;
    setRemovalTarget(undefined);
  }

  return {
    roster, outgoing, pickerOpen, setPickerOpen, invite, cancelInvitation, notice,
    headingRef, membersHeadingRef, invitationsHeadingRef, cancelingId: cancel.isPending ? cancel.variables : undefined,
    updateMemberRole, changingRole: changeRole.isPending,
    removalTarget, requestRemoval, cancelRemoval, confirmRemoval, removing: remove.isPending, removalError,
  };
}
