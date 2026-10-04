import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCamera, IconFile, IconPlus } from './icons';

type Props = {
  onCapture?: () => void;
  onUploadFile?: () => void;
};

/**
 * Bottom-left FAB with the Camera / File actions from the design. Expands
 * upward so it never covers the nav bar, and closes on outside tap, Escape,
 * or route change.
 */
export function Fab({ onCapture, onUploadFile }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const actions = [
    { label: 'Scan with camera', Icon: IconCamera, onClick: onCapture },
    { label: 'Upload file', Icon: IconFile, onClick: onUploadFile },
  ].filter((action) => action.onClick) as {
    label: string;
    Icon: typeof IconCamera;
    onClick: () => void;
  }[];

  return (
    <>
      {/* Scrim */}
      <div 
        className={`pointer-events-none fixed inset-0 z-20 bg-[#181715] transition-opacity duration-300 ${
          open ? 'opacity-45 pointer-events-auto' : 'opacity-0'
        }`}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--safe-bottom)+100px)] z-30 mx-auto max-w-shell">
        <div ref={containerRef} className="pointer-events-auto flex flex-col items-start gap-3 pl-4">
          {open
            ? actions.map(({ label, Icon, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onClick();
                  }}
                  className="pressable flex items-center gap-2"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#181715] shadow-[0_4px_12px_rgba(24,23,21,0.12)]">
                    <Icon className="h-5 w-5 text-[#FAF9F5]" />
                  </div>
                  <div className="flex items-center justify-center rounded-full border border-[#E6DFD8] bg-[#FAF9F5] px-3 py-1.5 shadow-[0_4px_12px_rgba(24,23,21,0.06)]">
                    <span className="text-[13px] font-medium leading-[18px] text-[#141413]">{label}</span>
                  </div>
                </button>
              ))
            : null}

          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? 'Close actions' : 'Open actions'}
            onClick={() => setOpen((value) => !value)}
            className="pressable flex h-14 w-14 items-center justify-center rounded-full bg-[#A9583E] text-white shadow-[0_8px_24px_rgba(169,88,62,0.32)] transition-colors"
          >
            <IconPlus
              className={`h-6 w-6 transition-transform duration-200 ${open ? 'rotate-45' : ''}`}
            />
          </button>
        </div>
      </div>
    </>
  );
}

export type MediaKind = 'receipt' | 'recipe' | 'product' | 'order';

/** Routes to the media capture flow; kept here so the FAB stays self-contained. */
export function useFabNavigation(kind: MediaKind = 'receipt') {
  const navigate = useNavigate();
  return {
    onCapture: () => navigate(`/capture?source=camera&kind=${kind}`),
    onUploadFile: () => navigate(`/capture?source=file&kind=${kind}`),
  };
}
