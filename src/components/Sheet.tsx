import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Closes a sheet by going back, but falls back to the list it was opened from
 * when the sheet was loaded directly (a deep link has no history behind it and
 * `navigate(-1)` would leave the app).
 */
export function useSheetClose(fallback: string) {
  const navigate = useNavigate();
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === 'number' && idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. */
  label: string;
  children: ReactNode;
};

/**
 * Bottom sheet matching the OpenPencil "Modal / *" frames: scrim, sheet surface
 * with a grabber, Escape and scrim-tap dismissal, and background scroll lock.
 */
export function Sheet({ open, onClose, label, children }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      // Keep focus inside the sheet while it owns the screen.
      if (event.key !== 'Tab' || !sheetRef.current) return;
      const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // Preserve the scroll position so the list behind the sheet does not jump.
    const scrollY = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, scrollY);

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

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
  tone?: 'card' | 'success' | 'danger' | 'teal';
}) {
  const tones = {
    card: 'bg-surface-card text-ink',
    success: 'bg-semantic-success text-ink',
    danger: 'bg-semantic-error text-ink-on-primary',
    teal: 'bg-brand-teal text-ink',
  } as const;
  return (
    <span className={`inline-flex items-center rounded-pill px-3 py-1 text-label font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}