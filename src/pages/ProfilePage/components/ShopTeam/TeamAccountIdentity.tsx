import type { ShopAccountMatch } from "@/features/shops/shopTeamApi";

export function TeamAccountIdentity({ account }: { account: Pick<ShopAccountMatch, "fullName" | "email"> }) {
  return (
    <span className="min-w-0">
      <span className="block break-words text-body font-semibold text-ink">{account.fullName?.trim() || "No name set"}</span>
      <span className="block break-all text-[13px] text-ink-muted">{account.email}</span>
    </span>
  );
}
