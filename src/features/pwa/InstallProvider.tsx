import { Sheet } from '@/components/Sheet/Sheet';
import type { ReactNode } from 'react';
import { InstallContext } from './installContext';
import { useInstallProvider } from './InstallProvider.module';

export function InstallProvider({ children }: { children: ReactNode }) {
  const install = useInstallProvider();
  return (
    <InstallContext.Provider
      value={{
        canInstall: install.canInstall,
        showPopover: install.showPopover,
        busy: install.busy,
        error: install.error,
        install: install.install,
        dismiss: install.dismiss,
      }}
    >
      {children}
      {install.error ? (
        <p role="alert" className="fixed inset-x-4 top-4 z-50 mx-auto max-w-shell rounded-card bg-surface-dark p-4 text-body text-ink-on-dark">
          {install.error}
        </p>
      ) : null}
      <Sheet open={install.instructions && !install.installed} onClose={install.closeInstructions} label="Install Neuton">
        <div className="space-y-4 p-5">
          <h2 className="font-display text-title text-ink">Install Neuton</h2>
          <p className="text-body text-ink-muted">
            {install.ios
              ? 'In Safari, tap Share, then Add to Home Screen and Add. If you are using another browser, open this page in Safari first.'
              : 'Open your browser menu and choose Install app or Add to Home Screen. If neither option appears, use a browser that supports installing web apps.'}
          </p>
          <button type="button" className="pressable w-full rounded-pill bg-brand-primary px-5 py-3 text-ink-on-primary" onClick={install.closeInstructions}>
            Got it
          </button>
        </div>
      </Sheet>
    </InstallContext.Provider>
  );
}
