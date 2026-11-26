import { ErrorState, InlineNotice, Spinner } from "@/components/feedback";
import { IconChevronRight, IconClose, IconSearch } from "@/components/icons";
import { Sheet } from "@/components/Sheet/Sheet";
import { Button } from "@/components/ui";
import type { InviteRole, ShopAccountMatch } from "@/features/shops/shopTeamApi";
import { useInviteTeammateSheet, type InviteTeammateSheetProps } from "./InviteTeammateSheet.module";

const eligibilityLabels = { member: "Already on team", pending: "Invite pending" };
const accountRow = "flex min-h-[59px] w-full items-center justify-between gap-2 px-3 py-2 text-left";
const roleLabels = { member: "Member", admin: "Admin" };
const roles: InviteRole[] = ["member", "admin"];

function AccountIdentity({ account }: { account: ShopAccountMatch }) {
  return (
    <span className="min-w-0">
      <span className="block break-words text-body font-semibold text-ink">{account.fullName?.trim() || "No name set"}</span>
      <span className="block break-all text-[13px] text-ink-muted">{account.email}</span>
    </span>
  );
}

export function InviteTeammateSheet(props: InviteTeammateSheetProps) {
  return <ScopedInviteTeammateSheet key={`${props.userId}/${props.shopId}`} {...props} />;
}

function ScopedInviteTeammateSheet(props: InviteTeammateSheetProps) {
  const { shopName } = props;
  const {
    account, role, setRole, selectAccount, input, changeInput, page, changePage, results,
    closeRef, searchRef, roleRef, close, submit, backToSearch, inviting, inviteFailed,
    searchFailed, searching, retry,
  } = useInviteTeammateSheet(props);

  return (
    <Sheet open label="Invite teammate" onClose={close}>
      <div className="min-h-0 overflow-y-auto px-4">
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-[30px] font-semibold leading-9 text-ink">Invite teammate</h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close invite teammate"
            disabled={inviting}
            onClick={close}
            className="pressable grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-card text-ink"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </header>

        {account ? (
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <p className="text-body text-ink-muted">Invite to {shopName}</p>
            <div className={`${accountRow} rounded-card bg-[#E7F0E7]`}>
              <AccountIdentity account={account} />
            </div>
            <fieldset disabled={inviting}>
              <legend className="mb-2 text-body font-semibold text-ink">Role</legend>
              <div className="grid grid-cols-2 gap-1 rounded-input bg-surface-soft p-1">
                {roles.map((option) => (
                  <label key={option} className="relative">
                    <input
                      ref={option === "member" ? roleRef : undefined}
                      type="radio"
                      name="shop-invite-role"
                      value={option}
                      checked={role === option}
                      onChange={() => setRole(option)}
                      className="peer sr-only"
                    />
                    <span className="grid min-h-11 cursor-pointer place-items-center rounded-input text-body font-medium text-ink peer-checked:bg-white peer-checked:shadow-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand-primary">
                      {roleLabels[option]}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="text-[13px] text-ink-muted">Members can view orders. Admins can create and edit them.</p>
            {inviteFailed && <InlineNotice tone="error">Couldn’t send the invitation. Try again or choose another account.</InlineNotice>}
            <Button type="submit" loading={inviting} block>Send invite</Button>
            <Button variant="outline" disabled={inviting} onClick={backToSearch}>Back to search</Button>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="flex h-11 items-center gap-2 rounded-input border border-hairline bg-white px-3 focus-within:border-brand-primary">
              <IconSearch className="h-5 w-5 shrink-0 text-ink-muted" />
              <input
                ref={searchRef}
                type="search"
                autoComplete="off"
                aria-label="Search by name or email"
                placeholder="Search by name or email"
                value={input}
                maxLength={320}
                onChange={(event) => changeInput(event.currentTarget.value)}
                className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-muted"
              />
            </label>
            {searchFailed && (
              <ErrorState message="Couldn’t search for accounts." onRetry={retry} />
            )}
            {searching && (
              <div role="status" className="flex items-center gap-2 py-2 text-body text-ink-muted">
                <Spinner className="h-4 w-4" /> Searching accounts…
              </div>
            )}
            {results?.accounts.length === 0 && <p role="status" className="py-2 text-body text-ink-muted">No matching accounts.</p>}
            {!!results?.accounts.length && (
              <ul aria-label="Matching accounts" className="divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-white">
                {results.accounts.map((candidate) => (
                  <li key={candidate.id}>
                    {candidate.eligibility === "eligible" ? (
                      <button type="button" className={`${accountRow} hover:bg-surface-soft focus-visible:outline focus-visible:-outline-offset-2`} onClick={() => selectAccount(candidate)}>
                        <AccountIdentity account={candidate} />
                        <IconChevronRight className="h-5 w-5 shrink-0 text-ink-muted" />
                      </button>
                    ) : (
                      <div className={accountRow}>
                        <AccountIdentity account={candidate} />
                        <span className="max-w-[40%] shrink-0 rounded-pill bg-surface-soft px-2 py-1 text-center text-[11px] font-medium text-ink-muted">
                          {eligibilityLabels[candidate.eligibility]}
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {results && (results.pageCount > 1 || page > 1) && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p role="status" className="text-[13px] text-ink-muted">
                  {results.pageCount > 0 ? `Page ${results.page} of ${results.pageCount}` : "Page unavailable"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {page > 1 && <Button variant="outline" radius="input" onClick={() => changePage(page - 1)}>Previous page</Button>}
                  {page < results.pageCount && <Button variant="outline" radius="input" onClick={() => changePage(page + 1)}>Next page</Button>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
