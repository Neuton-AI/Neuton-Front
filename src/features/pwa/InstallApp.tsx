import { useInstallApp } from './installContext';

function InstallIcon({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 2.5V11.5M5.25 8L9 11.75L12.75 8M3 14.5H15" />
    </svg>
  );
}

export function InstallAppButton() {
  const state = useInstallApp();
  if (!state?.canInstall) return null;
  return (
    <button
      type="button"
      disabled={state.busy}
      onClick={() => void state.install()}
      className="pressable flex h-9 items-center gap-[7px] rounded-[18px] bg-surface-card px-3.5 text-[14px] font-medium leading-5 text-brand-primary-active disabled:opacity-60"
    >
      <InstallIcon className="h-4 w-4" />
      Install app
    </button>
  );
}

export function InstallAppPopover() {
  const state = useInstallApp();
  if (!state?.showPopover) return null;
  return (
    <aside
      aria-label="Install Neuton"
      className="fixed inset-x-4 bottom-[calc(max(var(--safe-bottom),12px)+88px)] z-[35] mx-auto flex max-w-[388px] flex-col gap-[18px] rounded-[20px] bg-[#181715] p-5 shadow-[0_12px_36px_#14131347,0_2px_6px_#1413131F]"
    >
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] bg-brand-primary font-display text-[34px] leading-[34px] tracking-[-0.5px] text-white"
        >
          N
        </span>
        <div className="min-w-0 space-y-[3px]">
          <h2 className="font-display text-[26px] leading-7 tracking-[-0.3px] text-[#FAF9F5]">
            Install Neuton
          </h2>
          <p className="text-[13px] font-medium leading-[18px] text-[#A09D96]">
            Quick access from your home screen, even offline.
          </p>
        </div>
      </div>
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={state.dismiss}
          className="pressable h-[46px] w-[116px] shrink-0 rounded-[14px] bg-[#252320] text-[15px] font-medium text-[#FAF9F5]"
        >
          Not now
        </button>
        <button
          type="button"
          disabled={state.busy}
          onClick={() => void state.install()}
          className="pressable flex h-[46px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-brand-primary text-[15px] font-semibold text-white disabled:opacity-60"
        >
          <InstallIcon className="h-[18px] w-[18px]" />
          Install
        </button>
      </div>
    </aside>
  );
}
