import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSheetDrag } from './useSheetDrag';
type Props = {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. */
  label: string;
  children: ReactNode;
};
export function useSheet({ open, onClose }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useSheetDrag(sheetRef, open, onClose);

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
  return { sheetRef };
}
export type SheetModel = ReturnType<typeof useSheet>;

export function useSheetClose(fallback: string) {
  const navigate = useNavigate();
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === 'number' && idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}
