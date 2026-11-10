import { StrictMode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/render';
import { ApiError } from '@/lib/api';
import userEvent from '@testing-library/user-event';
import { GoogleCompletionPage } from '../GoogleCompletionPage';

const mock = vi.hoisted(() => ({ take: vi.fn(), complete: vi.fn(), retry: vi.fn(), restore: vi.fn() }));
vi.mock('@/features/auth/google-return', () => ({ takeGoogleCompletion: mock.take }));
vi.mock('@/features/auth/auth', () => ({
  completeGoogleSignIn: mock.complete, retryGoogleSession: mock.retry, restoreSession: mock.restore,
}));

it('submits completion once in Strict Mode and navigates to the dashboard', async () => {
  mock.take.mockReturnValue({ completionId: 'fixture', purpose: 'sign_in' });
  mock.complete.mockResolvedValue(undefined);
  renderWithRouter(
    <StrictMode>
      <Routes>
        <Route path="/auth/complete" element={<GoogleCompletionPage />} />
        <Route path="/dashboard" element={<h1>Dashboard</h1>} />
      </Routes>
    </StrictMode>,
    { route: '/auth/complete' },
  );
  expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  expect(mock.take).toHaveBeenCalledTimes(1);
  expect(mock.complete).toHaveBeenCalledExactlyOnceWith('fixture', 'sign_in');
});

it('returns to Profile after linking and retries session refresh without resubmitting proof', async () => {
  mock.take.mockReturnValue({ completionId: 'fixture', purpose: 'link' });
  mock.complete.mockClear().mockRejectedValue(new ApiError('Session unavailable', 503, 'SESSION_CONFIRMATION_FAILED'));
  mock.retry.mockResolvedValue(undefined);
  renderWithRouter(
    <Routes>
      <Route path="/auth/complete" element={<GoogleCompletionPage />} />
      <Route path="/profile" element={<h1>Profile</h1>} />
    </Routes>,
    { route: '/auth/complete' },
  );
  await userEvent.click(await screen.findByRole('button', { name: 'Retry session check' }));
  expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
  expect(mock.complete).toHaveBeenCalledExactlyOnceWith('fixture', 'link');
  expect(mock.retry).toHaveBeenCalledTimes(1);
});

it('returns to the sign-in route to resolve a session that appeared during Google completion', async () => {
  mock.take.mockReturnValue({ completionId: 'fixture', purpose: 'sign_in' });
  mock.complete.mockClear().mockRejectedValue(new ApiError('Your session changed', 409, 'GOOGLE_SESSION_CHANGED'));
  mock.restore.mockResolvedValue(undefined);
  renderWithRouter(
    <Routes>
      <Route path="/auth/complete" element={<GoogleCompletionPage />} />
      <Route path="/signin" element={<h1>Sign-in route</h1>} />
    </Routes>,
    { route: '/auth/complete' },
  );
  expect(await screen.findByRole('heading', { name: 'Sign-in route' })).toBeInTheDocument();
  expect(mock.restore).toHaveBeenCalledTimes(1);
  expect(mock.complete).toHaveBeenCalledTimes(1);
});
