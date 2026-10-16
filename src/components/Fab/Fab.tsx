import { IconPlus } from '@/components/icons';
import type { ReactNode } from 'react';
import { useFab } from './Fab.module';
type Props = {
  onCapture?: () => void;
  onUploadFile?: () => void;
  action?: ReactNode;
};

export function Fab({ onCapture, onUploadFile, action }: Props) {
  const { open, setOpen, containerRef, actions } = useFab({ onCapture, onUploadFile, action });
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

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--safe-bottom)+100px)] z-30 mx-auto max-w-shell px-4">
        <div ref={containerRef} className="pointer-events-auto flex items-end gap-3">
          <div className="flex flex-col items-start gap-3">
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
                      <span className="text-[13px] font-medium leading-[18px] text-[#141413]">
                        {label}
                      </span>
                    </div>
                  </button>
                ))
              : null}

            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? 'Close actions' : 'Open actions'}
              onClick={() => setOpen((value) => !value)}
              className="pressable flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white shadow-[0_8px_24px_rgba(204,120,92,0.32)] transition-colors"
            >
              <IconPlus
                className={`h-6 w-6 transition-transform duration-200 ${open ? 'rotate-45' : ''}`}
              />
            </button>
          </div>

          {action ? <div className="min-w-0 flex-1">{action}</div> : null}
        </div>
      </div>
    </>
  );
}
