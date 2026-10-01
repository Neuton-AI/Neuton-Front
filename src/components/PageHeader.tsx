import type { ReactNode } from 'react';
import { IconChevronLeft } from './icons';

type PageHeaderProps = {
  /** Small uppercase line above the title, e.g. the weekday and date. */
  eyebrow?: string;
  title: string;
  /** Rendered on the right of the title row (shop switcher, filters). */
  action?: ReactNode;
  /** Shows a back chevron; pass the handler rather than building the button here. */
  onBack?: () => void;
};

export function PageHeader({ eyebrow, title, action, onBack }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-0.5 pt-2">
      <div className="flex items-start justify-between gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="pressable -ml-1 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-ink"
          >
            <IconChevronLeft className="h-5 w-5" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          {eyebrow ? <p className="eyebrow text-brand-primary">{eyebrow}</p> : null}
          <h1 className="font-display text-title text-ink">{title}</h1>
        </div>
        {action ? <div className="shrink-0 pt-1">{action}</div> : null}
      </div>
    </header>
  );
}