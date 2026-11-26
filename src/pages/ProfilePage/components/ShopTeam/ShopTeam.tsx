import { ErrorState, InlineNotice, Skeleton } from "@/components/feedback";
import { IconChevronLeft, IconPlus } from "@/components/icons";
import { Button } from "@/components/ui";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { InviteTeammateSheet } from "./InviteTeammateSheet";
import { useShopTeam } from "./ShopTeam.module";
import { TeamAccountIdentity } from "./TeamAccountIdentity";

type TeamListProps = {
  label: string;
  loading: boolean;
  errorMessage?: string;
  retry: () => void;
  emptyMessage: string;
  children?: ReactNode;
};

const roleLabels = { admin: "Admin", member: "Member" };

function memberInitials(fullName: string | null, email: string) {
  const words = (fullName?.trim() || email).split(/\s+/).slice(0, 2);
  return words.map((word) => Array.from(word)[0]).join("").toLocaleUpperCase();
}

function TeamList({ label, loading, errorMessage, retry, emptyMessage, children }: TeamListProps) {
  if (loading) {
    return <div role="status"><span className="sr-only">Loading {label.toLowerCase()}…</span><Skeleton className="h-[68px]" /></div>;
  }
  return (
    <>
      {errorMessage && <ErrorState message={errorMessage} onRetry={retry} />}
      {children && (
        <ul aria-label={label} className="divide-y divide-hairline rounded-card border border-hairline">
          {children}
        </ul>
      )}
      {!children && !errorMessage && <p className="rounded-card border border-hairline p-3 text-label text-ink-muted">{emptyMessage}</p>}
    </>
  );
}

export function ShopTeam({ userId, shopId, shopName }: { userId: string; shopId: string; shopName: string }) {
  const {
    roster, outgoing, pickerOpen, setPickerOpen, invite, cancelInvitation, notice,
    headingRef, invitationsHeadingRef, cancelingId,
  } = useShopTeam(userId, shopId);
  const members = roster.data?.members ?? [];
  const invitations = outgoing.data?.invitations ?? [];

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pb-28 pt-[calc(var(--safe-top)+26px)]">
      <header className="flex flex-col gap-2">
        <Link to="?tab=shop" replace className="pressable flex min-h-11 w-fit items-center gap-1 rounded-input pr-3 text-body font-medium text-ink">
          <IconChevronLeft className="h-[18px] w-[18px]" />
          Shop
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 ref={headingRef} tabIndex={-1} className="font-display text-title font-semibold text-ink focus:outline-none">Team</h1>
            <p className="break-words text-body text-ink-muted">{shopName}</p>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="pressable inline-flex min-h-11 shrink-0 items-center gap-2 rounded-input bg-brand-primary-active px-3 text-label font-semibold text-ink-on-primary"
          >
            <IconPlus className="h-[17px] w-[17px]" />
            Invite teammate
          </button>
        </div>
      </header>
      {notice && <InlineNotice tone={notice.tone}>{notice.message}</InlineNotice>}
      <section className="flex flex-col gap-3" aria-labelledby="team-members-heading">
        <h2 id="team-members-heading" className="eyebrow font-semibold">Team members</h2>
        <TeamList
          label="Team members"
          loading={roster.isPending}
          errorMessage={roster.isError ? "Couldn’t load team members." : undefined}
          retry={() => void roster.refetch()}
          emptyMessage="No team members yet"
        >
          {members.length > 0 && members.map((member) => (
            <li key={member.id} className="flex min-h-[68px] items-center gap-2.5 px-3 py-2.5">
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-card text-xs font-semibold text-brand-primary-active">
                {memberInitials(member.fullName, member.email)}
              </span>
              <div className="min-w-0 flex-1"><TeamAccountIdentity account={member} /></div>
              <span className="shrink-0 rounded-pill bg-surface-card px-2 py-1 text-xs font-semibold text-ink">{roleLabels[member.role]}</span>
            </li>
          ))}
        </TeamList>
      </section>
      <section className="flex flex-col gap-3" aria-labelledby="team-invitations-heading">
        <h2 id="team-invitations-heading" ref={invitationsHeadingRef} tabIndex={-1} className="eyebrow font-semibold">Pending invitations</h2>
        <TeamList
          label="Pending invitations"
          loading={outgoing.isPending}
          errorMessage={outgoing.isError ? "Couldn’t load pending invitations." : undefined}
          retry={() => void outgoing.refetch()}
          emptyMessage="No pending invitations"
        >
          {invitations.length > 0 && invitations.map((invitation) => (
            <li key={invitation.id} className="flex items-center justify-between gap-2.5 p-3">
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <TeamAccountIdentity account={invitation} />
                <span className="rounded-pill bg-[#F3E9D8] px-2 py-1 text-xs font-semibold text-[#795027]">
                  Invited as {roleLabels[invitation.offeredRole]}
                </span>
              </div>
              <Button
                variant="outline"
                radius="input"
                className="shrink-0"
                aria-label={`Cancel invitation for ${invitation.email}`}
                disabled={Boolean(cancelingId)}
                loading={cancelingId === invitation.id}
                onClick={() => void cancelInvitation(invitation.id)}
              >
                Cancel
              </Button>
            </li>
          ))}
        </TeamList>
      </section>
      {pickerOpen && (
        <InviteTeammateSheet
          userId={userId}
          shopId={shopId}
          shopName={shopName}
          onClose={() => setPickerOpen(false)}
          onInvite={invite}
        />
      )}
    </main>
  );
}
