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
import { NewOrderPage } from '../NewOrderPage';
vi.mock('@/features/auth/auth', async () => (await import('@/test/auth')).authMock);
vi.mock('@/features/sync/documentsApi', async () => ({ documentFetch: (await import('@/lib/api')).apiFetch }));
beforeEach(resetAuth);
const renderPage = () => renderWithRouter(<Routes>
  <Route path='/orders/new' element={<NewOrderPage />} />
  <Route path='/orders/:id' element={<h1>Saved order</h1>} />
</Routes>, { route: '/orders/new' });

it('prices locally and saves required fields through real HTTP', async () => {
  server.use(http.get(apiPath('/recipes'), () => HttpResponse.json({ recipes: [buildRecipe({ status: 'verified' })] })));
  const user = userEvent.setup();
  renderPage();
  expect(screen.getByRole('button', { name: 'Add at least one item' })).toBeDisabled();
  await user.click(await screen.findByRole('button', { name: 'Add one Tomato Soup' }));
  await user.type(screen.getByLabelText('Customer name'), 'Ada');
  await user.type(screen.getByLabelText('Delivery address'), '12 Main St');
  expect(screen.queryByLabelText('Distance')).toBeNull();
  expect(screen.getByLabelText('Delivery date')).toHaveValue(screen.getByLabelText('Order date').getAttribute('value'));
  await user.click(screen.getByRole('button', { name: 'Save order · $10.50' }));
  expect(await screen.findByRole('heading', { name: 'Saved order' })).toBeInTheDocument();
});

it.each(['0.00', '4.00'])('lets users select partial recipes with known unit price %s', async unitPrice => {
  const recipe = buildRecipe({ name: 'Brownies', status: 'verified', orderPricing: { unitPrice, unitCost: '0.0000', costComplete: false } });
  server.use(http.get(apiPath('/recipes'), () => HttpResponse.json({ recipes: [recipe] })));
  const user = userEvent.setup();
  renderPage();
  const row = (await screen.findByText('Brownies')).closest('li')!;
  expect(within(row).getByText('Incomplete')).toBeInTheDocument();
  const add = within(row).getByRole('button', { name: 'Add one Brownies' });
  expect(add).toBeEnabled();
  expect(within(row).queryByRole('link', { name: 'Complete' })).toBeNull();
  await user.click(add);
  expect(screen.getByRole('button', { name: `Save order · $${unitPrice}` })).toBeEnabled();
});
