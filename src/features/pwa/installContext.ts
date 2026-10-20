import { createContext, useContext } from 'react';

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallState = {
  canInstall: boolean;
  showPopover: boolean;
  busy: boolean;
  error: string | null;
  install: () => Promise<void>;
  dismiss: () => void;
};

export const InstallContext = createContext<InstallState | null>(null);
export const useInstallApp = () => useContext(InstallContext);
