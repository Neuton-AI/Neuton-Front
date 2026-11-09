import { StrictMode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/render';
import { ApiError } from '@/lib/api';
import userEvent from '@testing-library/user-event';
import { GoogleCompletionPage } from '../GoogleCompletionPage';

const mock = vi.hoisted(() => ({ take: vi.fn(), complete: vi.fn(), retry: vi.fn() }));
vi.mock('@/features/auth/google-return', () => ({ takeGoogleCompletionId: mock.take }));
vi.mock('@/features/auth/auth', () => ({ completeGoogleSignIn: mock.complete, retryGoogleSession: mock.retry }));

it('submits completion once in Strict Mode and navigates to the dashboard', async () => {
  mock.take.mockReturnValue('fixture');
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
  expect(mock.complete).toHaveBeenCalledExactlyOnceWith('fixture');
});

it('retries a failed session refresh without resubmitting completion', async () => {
  mock.take.mockReturnValue('fixture');
  mock.complete.mockClear().mockRejectedValue(new ApiError('Session unavailable', 503, 'SESSION_CONFIRMATION_FAILED'));
  mock.retry.mockResolvedValue(undefined);
  renderWithRouter(
    <Routes>
      <Route path="/auth/complete" element={<GoogleCompletionPage />} />
      <Route path="/dashboard" element={<h1>Dashboard</h1>} />
    </Routes>,
    { route: '/auth/complete' },
  );
  await userEvent.click(await screen.findByRole('button', { name: 'Retry session check' }));
  expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  expect(mock.complete).toHaveBeenCalledTimes(1);
  expect(mock.retry).toHaveBeenCalledTimes(1);
});
