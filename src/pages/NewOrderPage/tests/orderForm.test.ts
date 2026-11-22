import { expect, it } from 'vitest';
import { orderDateTimestamp, todayInShop, validOrderDate } from '../orderForm';

it.each(['Pacific/Kiritimati', 'America/Los_Angeles', 'Asia/Jerusalem'])('keeps the requested order calendar date in %s', timeZone => {
  const timestamp = orderDateTimestamp('2026-11-19', timeZone);
  expect(todayInShop(timeZone, new Date(timestamp))).toBe('2026-11-19');
});
it('starts today in the shop timezone rather than the browser UTC day', () => {
  expect(todayInShop('Pacific/Kiritimati', new Date('2026-11-18T15:00:00Z'))).toBe('2026-11-19');
  expect(todayInShop('America/Los_Angeles', new Date('2026-11-19T01:00:00Z'))).toBe('2026-11-18');
});
it('rejects invalid calendar dates and preserves leap days', () => {
  for (const date of ['', '0000-01-01', '2026-02-29', '2026-13-01']) {
    expect(validOrderDate(date)).toBe(false);
  }
  expect(validOrderDate('2028-02-29')).toBe(true);
});
