import { resetAuth } from '@/test/auth';
import { renderWithRouter } from '@/test/render';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { NewOrderPage } from './NewOrderPage';
vi.mock('@/features/auth/supabase', async () => (await import('@/test/auth')).authMock);
beforeEach(resetAuth);
it('loads a recipe, prices its quantity and opens the saved order through real HTTP', async () => {
  const user = userEvent.setup();
  renderWithRouter(
    <Routes>
      <Route path="/orders/new" element={<NewOrderPage />} />
      <Route path="/orders/:id" element={<h1>Saved order</h1>} />
    </Routes>,
    { route: '/orders/new' },
  );
  expect(screen.getByRole('button', { name: 'Add at least one item' })).toBeDisabled();
  await user.click(await screen.findByRole('button', { name: 'Add one Soup' }));
  const save = await screen.findByRole('button', { name: 'Save order · $12.00' });
  expect(save).toBeEnabled();
  await user.click(save);
  expect(await screen.findByRole('heading', { name: 'Saved order' })).toBeInTheDocument();
});

vi.mock('@/features/sync/documentsApi', async () => ({ documentFetch: (await import('@/lib/api')).apiFetch }));
