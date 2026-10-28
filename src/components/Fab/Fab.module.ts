import { IconCamera, IconFile } from "@/components/icons";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
type Props = {
  onCapture?: () => void;
  onUploadFile?: () => void;
  action?: ReactNode;
};
export function useFab({ onCapture, onUploadFile }: Props) {
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const actions = [
    { label: "Scan with camera", Icon: IconCamera, onClick: onCapture },
    { label: "Upload file", Icon: IconFile, onClick: onUploadFile },
  ].filter((action) => action.onClick) as {
    label: string;
    Icon: typeof IconCamera;
    onClick: () => void;
  }[];
  return { open, setOpen, containerRef, actions };
}
export type FabModel = ReturnType<typeof useFab>;

export function useFabNavigation(kind: MediaKind = "receipt") {
  const navigate = useNavigate();
  return {
    onCapture: () => navigate(`/capture?source=camera&kind=${kind}`),
    onUploadFile: () => navigate(`/capture?source=file&kind=${kind}`),
  };
}

export type MediaKind = "receipt" | "recipe" | "product" | "order";
