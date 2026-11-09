import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, expect, it, vi } from 'vitest';
import { restoreSession } from '@/features/auth/auth';
import { apiFetch } from '@/lib/api';
import { apiPath } from '@/test/mocks/handlers/context';
import { server } from '@/test/mocks/server';
import { renderWithRouter } from '@/test/render';
import { MeTab } from '../components/MeTab/MeTab';

const account = { id: 'password-change-user', email: 'profile@example.test', fullName: null, avatarUrl: null };
const credentials = { currentPassword: 'current-test-password', newPassword: 'replacement-test-password' };
let sessionId: string;
let sessionReads: number;

beforeEach(async () => {
  sessionId = crypto.randomUUID();
  sessionReads = 0;
  server.use(
    http.get(apiPath('/session'), () => {
      sessionReads++;
      const expires = new Date(Date.now() + 60_000).toISOString();
      return HttpResponse.json({ user: account, memberships: [], session: {
        id: sessionId, idleExpiresAt: expires, absoluteExpiresAt: expires, nextRenewalAt: expires,
      } });
    }),
    http.post(apiPath('/auth/csrf'), () => HttpResponse.json({ token: `proof-${sessionId}` })),
  );
  await restoreSession();
});

async function fillForm() {
  renderWithRouter(<MeTab email={account.email} memberships={[]} activeShopId={null} creating={false}
    onSelectShop={vi.fn()} onCreateShop={vi.fn()} />);
  const user = userEvent.setup();
  const current = screen.getByLabelText('Current password');
  const replacement = screen.getByLabelText('New password');
  expect(current).toHaveAttribute('autocomplete', 'current-password');
  expect(replacement).toHaveAttribute('autocomplete', 'new-password');
  await user.type(current, credentials.currentPassword);
  await user.type(replacement, credentials.newPassword);
  return { user, current, replacement, submit: screen.getByRole('button', { name: 'Change password' }) };
}

it('enforces the UTF-16 boundary for a newly set password', async () => {
  const changes = vi.fn();
  server.use(http.post(apiPath('/profile/password'), async ({ request }) => {
    changes(await request.json());
    sessionId = 'unicode-replacement-session';
    return HttpResponse.json({ ok: true });
  }));
  const { current, replacement, submit } = await fillForm();
  const form = submit.closest('form')!;
  const limit = '😀'.repeat(64);
  fireEvent.change(current, { target: { value: limit + 'a' } });
  fireEvent.submit(form);
  expect(await screen.findByText('Enter your current password.')).toBeInTheDocument();
  expect(changes).not.toHaveBeenCalled();

  fireEvent.change(current, { target: { value: limit } });
  fireEvent.change(replacement, { target: { value: limit + 'a' } });
  fireEvent.submit(form);
  expect(await screen.findByText('Use 10 to 128 characters for your new password.')).toBeInTheDocument();
  expect(changes).not.toHaveBeenCalled();

  fireEvent.change(replacement, { target: { value: limit } });
  fireEvent.submit(form);
  await waitFor(() => expect(changes).toHaveBeenCalledWith({ currentPassword: limit, newPassword: limit }));
  await screen.findByText('Password changed.');
});

it('submits once and restores the replacement session with fresh proof for the next write', async () => {
  const original = sessionId;
  let releaseResponse!: () => void;
  const response = new Promise<void>((resolve) => { releaseResponse = resolve; });
  const changes = vi.fn();
  server.use(
    http.post(apiPath('/profile/password'), async ({ request }) => {
      changes();
      expect(request.credentials).toBe('same-origin');
      expect(request.headers.get('x-session-id')).toBe(original);
      expect(request.headers.get('x-csrf-token')).toBe(`proof-${original}`);
      expect(await request.json()).toEqual(credentials);
      await response;
      sessionId = 'replacement-session';
      return HttpResponse.json({ ok: true });
    }),
    http.patch(apiPath('/profile'), ({ request }) => {
      expect(request.headers.get('x-session-id')).toBe(sessionId);
      expect(request.headers.get('x-csrf-token')).toBe(`proof-${sessionId}`);
      return HttpResponse.json({ profile: account });
    }),
  );
  const { user, current, replacement, submit } = await fillForm();
  await user.click(submit);
  await waitFor(() => expect(changes).toHaveBeenCalledOnce());
  expect(submit).toBeDisabled();
  expect(current).toBeDisabled();
  expect(replacement).toBeDisabled();
  fireEvent.submit(submit.closest('form')!);
  await act(async () => releaseResponse());
  expect(await screen.findByText('Password changed.')).toBeInTheDocument();
  expect(changes).toHaveBeenCalledOnce();
  expect(current).toHaveValue('');
  expect(replacement).toHaveValue('');
  expect(sessionReads).toBe(2);
  await expect(apiFetch('/profile', { method: 'PATCH', userId: account.id, body: { fullName: 'Updated' } }))
    .resolves.toEqual({ profile: account });
});

it.each([
  [400, 'Current password is incorrect', 'Current password is incorrect.'],
  [503, 'Sensitive server detail', 'Password change is temporarily unavailable. Try again later.'],
])('shows a safe message for a confirmed %i response', async (status, message, notice) => {
  server.use(http.post(apiPath('/profile/password'), () => HttpResponse.json({ error: { message } }, { status })));
  const { user, current, replacement, submit } = await fillForm();
  await user.click(submit);
  expect(await screen.findByText(notice)).toBeInTheDocument();
  expect(current).toHaveValue('');
  expect(replacement).toHaveValue(credentials.newPassword);
  expect(sessionReads).toBe(1);
});

it('rechecks a lost response without replaying the password change', async () => {
  const changes = vi.fn();
  server.use(http.post(apiPath('/profile/password'), () => {
    changes();
    return HttpResponse.error();
  }));
  const { user, current, replacement, submit } = await fillForm();
  await user.click(submit);
  expect(await screen.findByText('Password change could not be confirmed.')).toBeInTheDocument();
  expect(changes).toHaveBeenCalledOnce();
  expect(sessionReads).toBe(2);
  expect(current).toHaveValue('');
  expect(replacement).toHaveValue('');
});
