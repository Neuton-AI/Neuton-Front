import type React from "react";
import { IconClose } from "@/components/icons";

interface ICaptureHeader {
  disabled: boolean;
  onClose: () => void;
}

export const CaptureHeader: React.FC<ICaptureHeader> = ({
  disabled,
  onClose,
}) => {
  return (
    <header className="capture-header">
      <button
        type="button"
        className="capture-close"
        aria-label="Close capture"
        disabled={disabled}
        onClick={onClose}
      >
        <IconClose className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </button>
      <h1>Capture</h1>
    </header>
  );
};
