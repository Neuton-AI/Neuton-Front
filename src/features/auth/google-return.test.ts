import { beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => vi.resetModules());

it('removes the completion fragment and keeps the opaque ID in memory for one read', async () => {
  const id = 'a'.repeat(43);
  window.history.replaceState(null, '', `/auth/complete#completionId=${id}&purpose=link`);
  const { takeGoogleCompletion } = await import('./google-return');
  expect(window.location.hash).toBe('');
  expect(takeGoogleCompletion()).toEqual({ completionId: id, purpose: 'link' });
  expect(takeGoogleCompletion()).toBeNull();
});

it('strips malformed fragments without returning an ID', async () => {
  window.history.replaceState(null, '', '/auth/complete#completionId=invalid');
  const { takeGoogleCompletion } = await import('./google-return');
  expect(window.location.hash).toBe('');
  expect(takeGoogleCompletion()).toBeNull();
});
