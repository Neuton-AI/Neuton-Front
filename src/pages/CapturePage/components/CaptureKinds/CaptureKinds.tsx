import type React from "react";
import type { MediaKind } from "@/features/uploads/types";

const KINDS: { key: MediaKind; label: string }[] = [
  { key: "receipt", label: "Receipt" },
  { key: "recipe", label: "Recipe" },
  { key: "product", label: "Product" },
  { key: "order", label: "Order" },
];

interface ICaptureKinds {
  kind: MediaKind;
  disabled: boolean;
  onSelect: (kind: MediaKind) => void;
}

export const CaptureKinds: React.FC<ICaptureKinds> = ({
  kind,
  disabled,
  onSelect,
}) => {
  return (
    <div className="capture-kinds" aria-label="Document type">
      {KINDS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          aria-pressed={kind === key}
          disabled={disabled}
          onClick={() => onSelect(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
