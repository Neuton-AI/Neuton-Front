import { useEffect, useRef, useState } from 'react';
import { type InstallPromptEvent } from './installContext';

const DISMISSED_KEY = 'neuton.installDismissedAt';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000;

function recentlyDismissed() {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISSED_KEY) ?? 0) < DISMISS_DURATION;
  } catch {
    return false;
  }
}

export function useInstallProvider() {
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
    const fullscreen = window.matchMedia('(display-mode: fullscreen)');
    const updateDisplay = () =>
      setInstalled(
        display.matches || fullscreen.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
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
    fullscreen.addEventListener('change', updateDisplay);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', afterInstall);
      display.removeEventListener('change', updateDisplay);
      fullscreen.removeEventListener('change', updateDisplay);
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

  const canInstall = !installed;
  return {
    canInstall,
    showPopover: canInstall && (available || ios) && !dismissed,
    busy,
    error,
    install,
    dismiss,
    instructions,
    installed,
    ios,
    closeInstructions: () => setInstructions(false),
  };
}
