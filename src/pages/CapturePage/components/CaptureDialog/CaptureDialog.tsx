import type React from "react";
import type { ReactNode } from "react";
import { useCaptureDialog } from "./CaptureDialog.module";

interface ICaptureDialog {
  open: boolean;
  title: string;
  className: string;
  instant: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const CaptureDialog: React.FC<ICaptureDialog> = ({
  open,
  title,
  className,
  instant,
  onClose,
  children,
}) => {
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
};
