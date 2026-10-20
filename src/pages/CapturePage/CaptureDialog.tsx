import type { ReactNode } from 'react';
import { useCaptureDialog } from './CaptureDialog.module';

export function CaptureDialog({
  open,
  title,
  className,
  instant,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  className: string;
  instant: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useCaptureDialog(open);
  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      className={`capture-dialog ${className}`}
      data-instant={instant || undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {children}
    </dialog>
  );
}
