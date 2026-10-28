import { useEffect, useRef, type ReactNode } from "react";
type Props = {
  open: boolean;
  /** Question shown as the dialog heading, e.g. "Delete this order?". */
  title: string;
  /** Consequence of confirming, in the caller's own words. */
  description: ReactNode;
  /** Label of the destructive action. Callers own the wording, so it can be
   *  truthful about a soft delete instead of always warning "forever". */
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};
export function useConfirmDialog({
  open,

  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Own the key while open: without this the Sheet behind the dialog
        // hears the same Escape and closes out from under the confirmation.
        event.stopImmediatePropagation();
        onCancel();
        return;
      }
      // Keep focus inside the dialog while it owns the screen.
      if (event.key !== "Tab" || !dialogRef.current) return;
      event.stopImmediatePropagation();
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])',
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

    // Preserve the scroll position so the page behind the dialog does not jump.
    const scrollY = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo(0, scrollY);

    // Capture phase so it runs before the Sheet's own bubble-phase handler.
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onCancel]);
  return { dialogRef, cancelRef };
}
export type ConfirmDialogModel = ReturnType<typeof useConfirmDialog>;
