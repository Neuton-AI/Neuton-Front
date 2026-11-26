import type React from "react";
import { IconChevronRight, IconEnvelope, IconStore } from "@/components/icons";
import type { ShopMembership } from "@/features/shops/types";
import { Link } from "react-router-dom";
import { CreateShopForm } from "./CreateShopForm/CreateShopForm";
import { SignInMethods } from "../SignInMethods";
interface IMeTab {
  email: string;
  memberships: ShopMembership[];
  activeShopId: string | null;
  unreadInvites?: number;
  creating: boolean;
  onSelectShop: (shopId: string, name: string) => void;
  onCreateShop: (name: string) => void;
}

export const MeTab: React.FC<IMeTab> = ({
  email,
  memberships,
  activeShopId,
  unreadInvites = 0,
  creating,
  onSelectShop,
  onCreateShop,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-1 rounded-card bg-surface-card p-4">
        <p className="eyebrow">Signed in as</p>
        <p className="truncate text-body font-medium text-ink">{email}</p>
      </section>

      <SignInMethods email={email} />

      <Link
        to="/profile/invites"
        className="pressable flex min-h-[66px] items-center gap-3 rounded-card border border-hairline bg-surface-card px-3 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary-active"
      >
        <span className="grid size-[38px] shrink-0 place-items-center rounded-input bg-surface-cream-strong text-brand-primary-active">
          <IconEnvelope className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body font-semibold text-ink">My Invites</span>
          {unreadInvites > 0 && (
            <span className="text-label text-ink-muted">
              {unreadInvites} {unreadInvites === 1 ? "new invitation" : "new invitations"}
            </span>
          )}
        </span>
        {unreadInvites > 0 && <span className="size-2 shrink-0 rounded-full bg-semantic-error" aria-hidden="true" />}
        <IconChevronRight className="size-[17px] shrink-0 text-ink-muted" />
      </Link>

      <section>
        <h2 className="eyebrow">Your shops</h2>
        <div className="mt-2 flex flex-col gap-2">
          {memberships.length === 0 ? (
            <CreateShopForm busy={creating} onSubmit={onCreateShop} />
          ) : (
            memberships.map(({ shopId, role, shops }) => {
              const selected = shopId === activeShopId;
              return (
                <button
                  key={shopId}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectShop(shopId, shops.name)}
                  className={`pressable flex w-full items-center gap-3 rounded-card p-4 text-left ${
                    selected
                      ? "bg-surface-dark text-ink-on-dark"
                      : "bg-surface-card text-ink"
                  }`}
                >
                  <IconStore
                    className={`h-5 w-5 shrink-0 ${
                      selected ? "text-ink-on-dark-soft" : "text-ink-muted"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[20px] leading-tight">
                      {shops.name}
                    </span>
                    <span
                      className={`block text-label ${
                        selected ? "text-ink-on-dark-soft" : "text-ink-muted"
                      }`}
                    >
                      {role[0]?.toUpperCase()}
                      {role.slice(1)} · {shops.currency}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
