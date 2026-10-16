export function Row({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={`text-label ${emphasis ? 'font-medium text-ink' : 'text-ink-muted'}`}>
        {label}
      </span>
      <span className={emphasis ? 'font-display text-[20px] text-ink' : 'text-body text-ink'}>
        {value}
      </span>
    </div>
  );
}
