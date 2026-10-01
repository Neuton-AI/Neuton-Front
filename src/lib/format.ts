/** Money arrives from Postgres as a decimal string, so parsing is explicit. */

export function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMoney(
  value: string | number | null | undefined,
  currency = 'USD',
  options: { compact?: boolean } = {},
): string {
  const amount = toNumber(value);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: options.compact || Math.abs(amount) >= 10000 ? 0 : 2,
      notation: options.compact && Math.abs(amount) >= 10000 ? 'compact' : 'standard',
    }).format(amount);
  } catch {
    // An unknown currency code should not blank out a revenue figure.
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatQuantity(
  value: string | number | null | undefined,
  unit?: string | null,
): string {
  const amount = toNumber(value);
  const trimmed = Number.isInteger(amount) ? String(amount) : amount.toFixed(3).replace(/0+$/, '');
  return unit ? `${trimmed} ${unit}` : trimmed;
}

export function formatPercent(value: string | number | null | undefined): string {
  const amount = toNumber(value);
  return `${amount > 0 ? '+' : ''}${amount.toFixed(1)}%`;
}

/** Postgres `date` columns arrive as YYYY-MM-DD, which must not be read as UTC. */
function parseDateInput(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  return new Date(value);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = parseDateInput(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatWeekday(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = parseDateInput(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}