import type { InviteRole, ShopTeamMember } from "@/features/shops/shopTeamApi";
import { useId, useRef, useState } from "react";

export function TeamMemberActions({ member, busy, onChangeRole, onRemove }: {
  member: ShopTeamMember;
  busy: boolean;
  onChangeRole: (role: InviteRole) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const name = member.fullName?.trim() || member.email;
  const isAdmin = member.role === "admin";

  function closeAndFocus() {
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div className="relative shrink-0" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }} onKeyDown={(event) => {
      if (open && event.key === "Escape") {
        event.stopPropagation();
        closeAndFocus();
      }
    }}>
      <button ref={trigger} type="button" aria-label={`Actions for ${name}`} aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((current) => !current)}
        className="pressable grid size-11 place-items-center rounded-input text-ink hover:bg-surface-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary-active"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden="true">
          <circle cx="5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="19" cy="12" r="1.7" />
        </svg>
      </button>
      {open && (
        <div id={id} className="absolute right-0 top-full z-20 w-56 max-w-[calc(100vw-32px)] rounded-card border border-hairline bg-surface-canvas p-1 shadow-md">
          <div className="border-b border-hairline px-2.5 py-2">
            <p className="break-words text-body font-semibold text-ink">{name}</p>
            <p className="text-label text-ink-muted">{isAdmin ? "Admin" : "Member"}</p>
          </div>
          <button type="button" disabled={busy} onClick={() => {
            closeAndFocus();
            onChangeRole(isAdmin ? "member" : "admin");
          }} className="pressable min-h-11 w-full rounded-input px-2.5 text-left text-body text-ink hover:bg-surface-card disabled:opacity-50">
            {isAdmin ? "Downgrade to Member" : "Promote to Admin"}
          </button>
          <button type="button" disabled={busy} onClick={() => {
            closeAndFocus();
            onRemove();
          }} className="pressable min-h-11 w-full rounded-input px-2.5 text-left text-body text-semantic-error hover:bg-surface-card disabled:opacity-50">
            Remove access
          </button>
        </div>
      )}
    </div>
  );
}
