import type React from "react";
import { IconClose, IconWarning } from "@/components/icons";
import type { ReactNode } from "react";
import { useConfirmDialog } from "./ConfirmDialog.module";
interface IConfirmDialog {
  open: boolean;
  /** Question shown as the dialog heading, e.g. "Delete this order?". */
  title: string;
  /** Consequence of confirming, in the caller's own words. */
  description: ReactNode;
  /** Label of the destructive action. Callers own the wording, so it can be
   *  truthful about a soft delete instead of always warning "forever". */
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "destructive" | "standard";
  pending?: boolean;
  confirmDisabled?: boolean;
  feedback?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<IConfirmDialog> = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "destructive",
  pending = false,
  confirmDisabled = false,
  feedback,
  onConfirm,
  onCancel,
}) => {
  const { dialogRef, cancelRef } = useConfirmDialog({
    open,
    title,
    description,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
  });
  if (!open) return null;
  const standard = variant === "standard";
  const surfaceClass = standard ? "bg-surface-canvas" : "bg-white";
  const titleClass = standard ? "font-display text-[28px] font-semibold" : "text-[20px] font-bold";
  const confirmClass = standard ? "bg-brand-primary text-ink hover:bg-brand-primary/90" : "bg-semantic-error text-white hover:bg-[#B03C3C]";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        type="button"
        aria-label={standard ? undefined : "Close"}
        aria-hidden={standard ? true : undefined}
        tabIndex={standard ? -1 : undefined}
        onClick={onCancel}
        className="absolute inset-0 bg-surface-dark/45 animate-[fade-in_200ms_ease-out]"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        aria-busy={pending}
        className={`relative flex w-full max-w-[400px] flex-col gap-4 rounded-[16px] border border-hairline p-6 shadow-[0_20px_50px_rgba(20,20,19,0.18)] motion-safe:animate-[sheet-in_220ms_cubic-bezier(0.32,0.72,0,1)] ${surfaceClass}`}
      >
        {!standard && (
          <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-[#FEF3C7] text-ink">
            <IconWarning className="h-[22px] w-[22px]" />
          </span>
        )}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <h2 id="confirm-dialog-title" className={`leading-[1.2] text-ink ${titleClass}`}>{title}</h2>
            {standard && (
              <button type="button" aria-label="Close confirmation" onClick={onCancel} disabled={pending}
                className="pressable flex size-9 shrink-0 items-center justify-center rounded-pill bg-surface-card text-ink">
                <IconClose className="size-4" />
              </button>
            )}
          </div>
          <p
            id="confirm-dialog-description"
            className="text-[14px] leading-[1.5] text-ink-muted"
          >
            {description}
          </p>
        </div>
        {feedback}
        <div className="flex gap-2.5">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="pressable inline-flex h-11 flex-1 items-center justify-center rounded-[10px] border border-hairline bg-transparent text-[14px] font-semibold text-ink transition-colors hover:bg-surface-soft"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending || confirmDisabled}
            className={`pressable inline-flex h-11 flex-1 items-center justify-center rounded-[10px] px-1 text-[14px] font-semibold transition-colors disabled:opacity-50 ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
