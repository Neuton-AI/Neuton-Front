import { resetAuth } from '@/test/auth';
import { renderWithRouter } from '@/test/render';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { apiPath } from '@/test/mocks/handlers/context';
import { server } from '@/test/mocks/server';
import { buildRecipe } from '@/test/factories/recipes.factory';
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
  const save = await screen.findByRole('button', {
    name: 'Save order · $12.00',
  });
  expect(save).toBeEnabled();
  await user.click(save);
  expect(await screen.findByRole('heading', { name: 'Saved order' })).toBeInTheDocument();
});

vi.mock('@/features/sync/documentsApi', async () => ({
  documentFetch: (await import('@/lib/api')).apiFetch,
}));

it.each([false, true])(
  'shows disabled incomplete recipes with recovery (mixed: %s)',
  async (mixed) => {
    const recipe = buildRecipe({
      id: 'incomplete',
      name: 'Brownies',
      status: 'verified',
    });
    recipe.costing.costComplete = false;
    server.use(http.get(apiPath('/recipes'), () => HttpResponse.json({ recipes: [recipe] })));
    if (!mixed)
      server.use(http.get(apiPath('/recipes/orderable'), () => HttpResponse.json({ recipes: [] })));
    const user = userEvent.setup();
    renderWithRouter(
      <Routes>
        <Route path="/orders/new" element={<NewOrderPage />} />
        <Route path="/catalog/recipes/:id/edit" element={<h1>Complete recipe costs</h1>} />
      </Routes>,
      { route: '/orders/new' },
    );
    const row = (await screen.findByText('Brownies')).closest('li')!;
    expect(within(row).getByText('Incomplete')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Add one Brownies' })).toBeDisabled();
    expect(within(row).getByRole('button', { name: 'Remove one Brownies' })).toBeDisabled();
    expect(within(row).queryByText('$0.00')).toBeNull();
    if (mixed) expect(screen.getByRole('button', { name: 'Add one Soup' })).toBeEnabled();
    await user.click(within(row).getByRole('link', { name: 'Complete' }));
    expect(
      await screen.findByRole('heading', { name: 'Complete recipe costs' }),
    ).toBeInTheDocument();
  },
);
