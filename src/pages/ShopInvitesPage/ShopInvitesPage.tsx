import { BottomNav } from "@/components/BottomNav/BottomNav";
import { ErrorState, InlineNotice, Skeleton } from "@/components/feedback";
import { IconChevronLeft, IconStore } from "@/components/icons";
import { Layout } from "@/components/Layout/Layout";
import { Button } from "@/components/ui";
import type { IncomingInvitation, InvitationDecision } from "@/features/shops/shopInvitationsApi";
import { Link } from "react-router-dom";
import { useShopInvitesAccount, useShopInvitesPage } from "./ShopInvitesPage.module";

const roleLabels = { admin: "Admin", member: "Member" };

type InvitationCardProps = {
  invitation: IncomingInvitation;
  disabled: boolean;
  decision?: InvitationDecision;
  onRespond: (decision: InvitationDecision) => void;
};

function InvitationCard({ invitation, disabled, decision, onRespond }: InvitationCardProps) {
  return (
    <li className="flex flex-col gap-3 rounded-card border border-hairline bg-surface-card p-3">
      <div className="flex items-start gap-3">
        <span className="grid size-[38px] shrink-0 place-items-center rounded-input bg-surface-cream-strong text-brand-primary-active">
          <IconStore className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="break-words text-body font-semibold text-ink">{invitation.shopName}</h2>
          <p className="text-label text-ink-muted">{roleLabels[invitation.offeredRole]}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button radius="input" variant="outline" className="min-w-24 grow" disabled={disabled}
          loading={decision === "decline"} onClick={() => onRespond("decline")}>
          Decline
        </Button>
        <Button radius="input" variant="secondary" className="min-w-24 grow" disabled={disabled}
          loading={decision === "accept"} onClick={() => onRespond("accept")}>
          Accept
        </Button>
      </div>
    </li>
  );
}

function ShopInvites({ userId }: { userId: string }) {
  const { inbox, respond, action, notice, accepted, openShop, opening, memberships, headingRef } =
    useShopInvitesPage(userId);
  const invitations = inbox.data?.invitations || [];

  return (
    <Layout
      mainContent={
        <main className="flex flex-1 flex-col gap-4 px-4 pb-28 pt-[calc(var(--safe-top)+26px)]">
          <header className="flex flex-col gap-2">
            <Link to="/profile" className="pressable flex min-h-11 w-fit items-center gap-1 rounded-input pr-3 text-body font-medium text-ink">
              <IconChevronLeft className="size-[18px]" />
              Back to Profile
            </Link>
            <h1 ref={headingRef} tabIndex={-1} className="font-display text-title font-semibold text-ink focus:outline-none">
              My Invites
            </h1>
          </header>

          {notice && <InlineNotice tone={notice.tone}>{notice.message}</InlineNotice>}
          {accepted.map(({ shopId, shopName }) => {
            const canOpen = memberships.some((membership) => membership.shopId === shopId);
            return (
              <InlineNotice key={shopId} tone="success">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 break-words">You joined {shopName}.</span>
                  <Button radius="input" variant="outline" loading={opening} disabled={Boolean(action)}
                    onClick={() => void openShop(shopId)}>
                    {canOpen ? "Open shop" : "Refresh shop access"}
                  </Button>
                </div>
              </InlineNotice>
            );
          })}

          {inbox.isPending && (
            <div role="status">
              <span className="sr-only">Loading invitations…</span>
              <Skeleton className="h-32" />
            </div>
          )}
          {inbox.isError && <ErrorState message="Couldn’t load invitations." onRetry={() => void inbox.refetch()} />}
          {inbox.isSuccess && invitations.length === 0 && (
            <p className="rounded-card border border-hairline p-4 text-body text-ink-muted">No pending invitations</p>
          )}
          {inbox.isSuccess && invitations.length > 0 && (
            <ul aria-label="Pending invitations" className="flex flex-col gap-3">
              {invitations.map((invitation) => (
                <InvitationCard key={invitation.id} invitation={invitation} disabled={Boolean(action) || opening}
                  decision={action?.id === invitation.id ? action.decision : undefined}
                  onRespond={(decision) => void respond(invitation, decision)} />
              ))}
            </ul>
          )}
        </main>
      }
      footer={<BottomNav />}
    />
  );
}

export function ShopInvitesPage() {
  const userId = useShopInvitesAccount();
  return userId ? <ShopInvites key={userId} userId={userId} /> : null;
}
