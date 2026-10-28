import type { ReactNode } from 'react';

const PATHS = {
  plus: 'M12 5v14M5 12h14',
  send: 'M5 12.5l4.5 4.5L19 7',
  delete: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10 11v5M14 11v5',
  replace: 'M4 10a8 8 0 0 1 14-5l2 2M20 3v4h-4M20 14a8 8 0 0 1-14 5l-2-2M4 21v-4h4',
};

export function CaptureIcon({ kind }: { kind: keyof typeof PATHS }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={PATHS[kind]}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CaptureAction({
  label,
  variant = '',
  disabled,
  onClick,
  children,
}: {
  label: string;
  variant?: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`capture-action ${variant}`}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="capture-action-circle">{children}</span>
      <span>{label}</span>
    </button>
  );
}
