import type { ReactNode } from 'react';

type Props = {
  label: string;
  value?: ReactNode;
  /** Rendered between the label and the value, e.g. the average/median toggle. */
  middle?: ReactNode;
  sub?: ReactNode;
  tone?: 'card' | 'dark' | 'primary' | 'outline';
  className?: string;
};

const TONES = {
  card: 'bg-surface-card text-ink',
  dark: 'bg-surface-dark text-ink-on-dark',
  primary: 'bg-brand-primary text-ink-on-primary',
  outline: 'bg-surface-canvas text-ink border border-hairline',
} as const;

const SUB_TONE = {
  card: 'text-ink-muted',
  dark: 'text-ink-on-dark-soft',
  primary: 'text-ink-on-primary',
  outline: 'text-ink-muted',
} as const;

export function StatCard({ label, value, middle, sub, tone = 'card', className = '' }: Props) {
  return (
    <div className={`flex flex-col gap-1.5 rounded-card p-4 ${TONES[tone]} ${className}`}>
      <p className="text-eyebrow font-medium uppercase opacity-80">{label}</p>
      {middle}
      {value !== undefined ? <p className="font-display text-card-value">{value}</p> : null}
      {sub ? <p className={`text-label font-medium ${SUB_TONE[tone]}`}>{sub}</p> : null}
    </div>
  );
}