import { describe, expect, it, vi } from 'vitest';
import {
  formatDate,
  formatMoney,
  formatPercent,
  formatQuantity,
  formatWeekday,
  relativeTime,
  toNumber,
} from './format';

describe('toNumber', () => {
  it('parses the decimal strings Postgres returns for money columns', () => {
    expect(toNumber('12.50')).toBe(12.5);
    expect(toNumber('-3.99')).toBe(-3.99);
    expect(toNumber(7)).toBe(7);
  });

  it('collapses every unusable value to 0 rather than rendering NaN', () => {
    // A blank revenue figure must read as $0.00, not "$NaN".
    for (const value of [null, undefined, '', 'not-a-number', Number.NaN, Infinity]) {
      expect(toNumber(value as string | number | null | undefined)).toBe(0);
    }
  });
});

describe('formatMoney', () => {
  it('shows cents below 10,000 and whole units above', () => {
    expect(formatMoney('12.5')).toBe('$12.50');
    expect(formatMoney(12345.6)).toBe('$12,346');
  });

  it('honours the shop currency', () => {
    expect(formatMoney('12.5', 'ILS')).toContain('12.50');
    // A well-formed but unknown code is still handled by Intl, not the fallback.
    // Intl separates with U+00A0, so normalise before comparing.
    expect(formatMoney('12.5', 'ZZZ').replace(/\u00a0/g, ' ')).toBe('ZZZ 12.50');
  });

  it('falls back to a plain figure for a malformed currency code', () => {
    // Intl throws RangeError here; a revenue figure must survive regardless.
    expect(formatMoney('12.5', 'US$')).toBe('12.50 US$');
  });

  it('compacts only when asked and the amount is large', () => {
    expect(formatMoney(12345.6, 'USD', { compact: true })).toBe('$12K');
    expect(formatMoney(1000000, 'USD', { compact: true })).toBe('$1M');
    // Below the threshold compact keeps standard notation but drops the cents,
    // which is the current contract callers see.
    expect(formatMoney('12.5', 'USD', { compact: true })).toBe('$13');
  });

  it('renders a missing amount as zero, not NaN', () => {
    expect(formatMoney(null)).toBe('$0.00');
  });
});

describe('formatQuantity', () => {
  it('drops trailing zeros but keeps a meaningful fraction', () => {
    expect(formatQuantity('2.500')).toBe('2.5');
    expect(formatQuantity('3')).toBe('3');
    expect(formatQuantity('0.125')).toBe('0.125');
  });

  it('appends the unit when there is one', () => {
    expect(formatQuantity('2.5', 'kg')).toBe('2.5 kg');
    expect(formatQuantity('4', null)).toBe('4');
  });
});

describe('formatPercent', () => {
  it('signs gains and leaves losses unsigned, as the trend captions expect', () => {
    expect(formatPercent(12.34)).toBe('+12.3%');
    expect(formatPercent(-4)).toBe('-4.0%');
    expect(formatPercent(0)).toBe('0.0%');
  });
});

describe('formatDate', () => {
  it('reads a Postgres date column in local time, not UTC', () => {
    // The off-by-one here would silently shift every receipt by a day.
    expect(formatDate('2026-03-01')).toBe('Mar 1, 2026');
    expect(formatDate('2026-12-31')).toBe('Dec 31, 2026');
  });

  it('falls back to an em dash for missing or unparseable input', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
  });
});

describe('formatWeekday', () => {
  it('uppercases the weekday', () => {
    expect(formatWeekday('2026-03-01')).toBe('SUNDAY');
  });

  it('returns an empty string rather than an em dash', () => {
    expect(formatWeekday(null)).toBe('');
    expect(formatWeekday('nope')).toBe('');
  });
});

describe('relativeTime', () => {
  it('describes recent timestamps in coarse units', () => {
    const now = new Date('2026-03-10T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(relativeTime('2026-03-10T11:59:40Z')).toBe('just now');
    expect(relativeTime('2026-03-10T11:45:00Z')).toBe('15m ago');
    expect(relativeTime('2026-03-10T09:00:00Z')).toBe('3h ago');
    expect(relativeTime('2026-03-08T12:00:00Z')).toBe('2d ago');

    vi.useRealTimers();
  });

  it('stops using relative units after a week and shows the date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T12:00:00Z'));
    expect(relativeTime('2026-03-01T12:00:00Z')).toBe('Mar 1, 2026');
    vi.useRealTimers();
  });

  it('degrades to an em dash for missing or unparseable input', () => {
    expect(relativeTime(null)).toBe('—');
    expect(relativeTime('garbage')).toBe('—');
  });
});
