import type React from "react";
import type { ReactNode } from "react";

interface ISpinner {
  className?: string;
}

export const Spinner: React.FC<ISpinner> = ({ className = "h-5 w-5" }) => {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="2.5"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

/** Full-screen loader used while a session or shop is being resolved. */
interface IFullPageLoader {
  label?: string;
}

export const FullPageLoader: React.FC<IFullPageLoader> = ({
  label = "Loading",
}) => {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-surface-canvas">
      <Spinner className="h-7 w-7 text-brand-primary" />
      <p className="eyebrow">{label}</p>
    </div>
  );
};

interface ISkeleton {
  className?: string;
}

export const Skeleton: React.FC<ISkeleton> = ({ className = "" }) => {
  return (
    <div
      className={`animate-pulse rounded-card bg-surface-card ${className}`}
      aria-hidden="true"
    />
  );
};

interface IErrorState {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<IErrorState> = ({ message, onRetry }) => {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-card border border-semantic-error/30 bg-semantic-error/5 p-4"
    >
      <p className="text-body font-medium text-ink">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="pressable rounded-pill bg-surface-dark px-4 py-2 text-label font-medium text-ink-on-dark"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
};

interface IEmptyState {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export const EmptyState: React.FC<IEmptyState> = ({
  title,
  body,
  action,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon ? <div className="text-ink-muted-soft">{icon}</div> : null}
      <h2 className="font-display text-[26px] leading-tight text-ink">
        {title}
      </h2>
      <p className="max-w-[30ch] text-body text-ink-muted">{body}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
};

interface IInlineNotice {
  tone?: "info" | "error" | "success";
  children: ReactNode;
}

export const InlineNotice: React.FC<IInlineNotice> = ({
  tone = "info",
  children,
}) => {
  const styles = {
    info: "bg-surface-cream-strong text-ink",
    error: "border border-semantic-error/30 bg-semantic-error/5 text-ink",
    success: "border border-semantic-success/30 bg-semantic-success/5 text-ink",
  } as const;

  return (
    <div
      role="status"
      className={`rounded-card p-3 text-label font-medium ${styles[tone]}`}
    >
      {children}
    </div>
  );
};
