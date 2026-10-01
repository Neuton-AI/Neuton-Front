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
    { label: 'Camera', Icon: IconCamera, onClick: onCapture },
    { label: 'File', Icon: IconFile, onClick: onUploadFile },
  ].filter((action) => action.onClick) as {
    label: string;
    Icon: typeof IconCamera;
    onClick: () => void;
  }[];

  return (
    // The outer box spans the viewport so the inner column can centre itself in
    // the same max-width shell the rest of the app uses; anchoring the FAB to
    // left-0 directly would strand it on the viewport edge on desktop.
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
                className="pressable flex items-center gap-2.5 rounded-pill bg-surface-dark py-2 pl-3 pr-4 text-ink-on-dark shadow-[0_6px_20px_rgba(24,23,21,0.18)]"
              >
                <Icon className="h-5 w-5" />
                <span className="text-label font-medium">{label}</span>
              </button>
            ))
          : null}

        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Close actions' : 'Open actions'}
          onClick={() => setOpen((value) => !value)}
          className="pressable flex h-14 w-14 items-center justify-center rounded-pill bg-brand-primary text-ink-on-primary shadow-[0_8px_24px_rgba(204,120,92,0.32)]"
        >
          <IconPlus
            className={`h-6 w-6 transition-transform duration-200 ${open ? 'rotate-45' : ''}`}
          />
        </button>
      </div>
    </div>
  );
}

/** Routes to the media capture flow; kept here so the FAB stays self-contained. */
export function useFabNavigation() {
  const navigate = useNavigate();
  return {
    onCapture: () => navigate('/capture?source=camera'),
    onUploadFile: () => navigate('/capture?source=file'),
  };
}