import { Sheet } from '@/components/Sheet/Sheet';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { InstallContext, type InstallPromptEvent } from './installContext';

const DISMISSED_KEY = 'neuton.installDismissedAt';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000;

function recentlyDismissed() {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISSED_KEY) ?? 0) < DISMISS_DURATION;
  } catch {
    return false;
  }
}

export function InstallProvider({ children }: { children: ReactNode }) {
  const prompt = useRef<InstallPromptEvent | null>(null);
  const installing = useRef(false);
  const [available, setAvailable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(recentlyDismissed);
  const [busy, setBusy] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const display = window.matchMedia('(display-mode: standalone)');
    const updateDisplay = () =>
      setInstalled(
        display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
      );
    updateDisplay();
    // iPadOS can identify itself as macOS. Other iOS browsers get Safari guidance.
    setIos(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    );
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      prompt.current = event as InstallPromptEvent;
      setAvailable(true);
      setError(null);
    };
    const afterInstall = () => {
      prompt.current = null;
      setAvailable(false);
      setInstalled(true);
      setInstructions(false);
    };
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', afterInstall);
    display.addEventListener('change', updateDisplay);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', afterInstall);
      display.removeEventListener('change', updateDisplay);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      /* Session-only dismissal. */
    }
  };

  const install = async () => {
    if (installing.current || installed) return;
    setError(null);
    const event = prompt.current;
    if (!event) {
      setInstructions(true);
      return;
    }
    // Native prompt events may only be used once.
    prompt.current = null;
    installing.current = true;
    setBusy(true);
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      if (outcome === 'dismissed') dismiss();
    } catch {
      setError('Installation could not open. Use your browser menu to install Neuton.');
    } finally {
      setAvailable(false);
      installing.current = false;
      setBusy(false);
    }
  };

  // Profile is a persistent entry point, even before the browser offers a native prompt.
  const canInstall = !installed;
  return (
    <InstallContext.Provider
      value={{
        canInstall,
        showPopover: canInstall && (available || ios) && !dismissed,
        busy,
        error,
        install,
        dismiss,
      }}
    >
      {children}
      {error ? (
        <p
          role="alert"
          className="fixed inset-x-4 top-4 z-50 mx-auto max-w-shell rounded-card bg-surface-dark p-4 text-body text-ink-on-dark"
        >
          {error}
        </p>
      ) : null}
      <Sheet
        open={instructions && !installed}
        onClose={() => setInstructions(false)}
        label="Install Neuton"
      >
        <div className="space-y-4 p-5">
          <h2 className="font-display text-title text-ink">Install Neuton</h2>
          <p className="text-body text-ink-muted">
            {ios
              ? 'In Safari, tap Share, then Add to Home Screen and Add. If you are using another browser, open this page in Safari first.'
              : 'Open your browser menu and choose Install app or Add to Home Screen. If neither option appears, use a browser that supports installing web apps.'}
          </p>
          <button
            type="button"
            className="pressable w-full rounded-pill bg-brand-primary px-5 py-3 text-ink-on-primary"
            onClick={() => setInstructions(false)}
          >
            Got it
          </button>
        </div>
      </Sheet>
    </InstallContext.Provider>
  );
}
