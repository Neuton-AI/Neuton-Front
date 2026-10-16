import type { ReactNode } from 'react';
import { useSheet } from './Sheet.module';
type Props = {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. */
  label: string;
  children: ReactNode;
};

export function Sheet({ open, onClose, label, children }: Props) {
  const { sheetRef } = useSheet({ open, onClose, label, children });
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-surface-dark/45 animate-[fade-in_200ms_ease-out]"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative flex max-h-[88dvh] w-full max-w-shell flex-col rounded-t-[20px] bg-surface-canvas pb-[max(var(--safe-bottom),20px)] pt-2 shadow-[0_-12px_40px_rgba(24,23,21,0.28)] animate-[sheet-in_260ms_cubic-bezier(0.32,0.72,0,1)]"
      >
        <div className="flex justify-center pb-1" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-hairline" />
        </div>
        {children}
      </div>
    </div>
  );
}

/** Heading used inside the detail sheets; 18px medium per the design ramp. */
export function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-[18px] font-medium leading-[25px] text-ink">{title}</h2>
      {children}
    </section>
  );
}

/** Badge pill used for allergens, tags, and status. */
export function SheetBadge({
  children,
  tone = 'card',
}: {
  children: ReactNode;
  tone?: 'card' | 'success' | 'danger' | 'teal' | 'deleted';
}) {
  const tones = {
    card: 'bg-surface-card text-ink',
    success: 'bg-semantic-success text-ink',
    danger: 'bg-semantic-error text-ink-on-primary',
    teal: 'bg-brand-teal text-ink',
    // The design's "DELETED" pill: grey, spaced, and set in caps.
    deleted: 'bg-deleted-badge text-ink-muted uppercase tracking-[0.66px]',
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-pill px-3 py-1 text-label font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
