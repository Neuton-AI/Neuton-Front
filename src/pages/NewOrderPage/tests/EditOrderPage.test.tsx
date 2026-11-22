import { OrderDetailPage } from '@/pages/OrderDetailPage/OrderDetailPage';
import { authState, resetAuth } from '@/test/auth';
import { buildOrder } from '@/test/factories/order.factory';
import { buildRecipe } from '@/test/factories/recipes.factory';
import { apiPath } from '@/test/mocks/handlers/context';
import { server } from '@/test/mocks/server';
import { renderWithRouter } from '@/test/render';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { EditOrderPage } from '../NewOrderPage';

vi.mock('@/features/auth/auth', async () => (await import('@/test/auth')).authMock);
vi.mock('@/features/sync/documentsApi', async () => ({ documentFetch: (await import('@/lib/api')).apiFetch }));
beforeEach(resetAuth);

const recipe = buildRecipe({
  id: 'recipe-current', name: 'New recipe', status: 'verified',
  orderPricing: { unitPrice: '7.50', unitCost: '3.00', costComplete: true },
});
const order = {
  ...buildOrder({ id: 'saved', customerName: 'Maya', destinationAddress: '12 Main St', deliveryFee: '0.00', status: 'processing' }),
  orderDate: '2026-09-28T12:00:00.000Z',
  deliveryDate: null,
  items: [{ id: 'saved-line', recipeId: 'old-recipe', name: 'Original recipe', quantity: '2', unitPrice: '4.00', unitCost: '2.00' }],
};

function mount(path = '/orders/saved/edit') {
  return renderWithRouter(
    <Routes>
      <Route path="/orders/:id" element={<OrderDetailPage />} />
      <Route path="/orders/:id/edit" element={<EditOrderPage />} />
    </Routes>,
    { route: path },
  );
}

it('opens the shared editor and updates the current order with distinct saved and new line payloads', async () => {
  let current = order;
  const save = vi.fn();
  server.use(
    http.get(apiPath('/orders/saved'), () => HttpResponse.json({ order: current, syncVersion: 1000 })),
    http.get(apiPath('/recipes'), () => HttpResponse.json({
      recipes: [recipe, { ...recipe, id: 'old-recipe', name: 'Renamed original' }],
    })),
    http.patch(apiPath('/orders/saved'), async ({ request }) => {
      save(await request.json(), request.headers.get('x-sync-base-version'));
      current = { ...order, customerName: 'Maya Cohen' };
      return HttpResponse.json({ order: current, syncVersion: 1001 });
    }),
  );
  const user = userEvent.setup();
  mount('/orders/saved');
  await user.click(await screen.findByRole('button', { name: 'Edit' }));
  const name = await screen.findByLabelText('Customer name');
  expect(name).toHaveValue('Maya');
  expect(screen.getByLabelText('Delivery date')).toHaveValue('');
  expect(screen.getByLabelText('Delivery fee')).toHaveValue(0);
  const selected = screen.getByRole('list', { name: 'Selected items' });
  expect(within(selected).getByText('$4.00')).toBeVisible();
  await user.click(within(selected).getByRole('button', { name: 'Add one Original recipe' }));
  await user.type(name, ' Cohen');
  await user.click(screen.getByRole('button', { name: 'Add item' }));
  await user.click(await screen.findByRole('option', { name: 'New recipe' }));
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('heading', { name: 'Maya Cohen' })).toBeVisible();
  expect(save).toHaveBeenCalledExactlyOnceWith({
    customerName: 'Maya Cohen',
    deliveryFee: '0.00',
    items: [{ lineId: 'saved-line', quantity: 3 }, { recipeId: recipe.id, quantity: 1, expectedUnitPrice: '7.50' }],
  }, '1000');
});

it('keeps unsaved fields in the editor when the server rejects a stale edit', async () => {
  server.use(
    http.get(apiPath('/orders/saved'), () => HttpResponse.json({ order, syncVersion: 1000 })),
    http.patch(apiPath('/orders/saved'), () => HttpResponse.json({
      error: { message: 'This order changed. Reopen it before saving your changes.' },
    }, { status: 409 })),
  );
  const user = userEvent.setup();
  mount();
  const name = await screen.findByLabelText('Customer name');
  await user.type(name, ' Cohen');
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByText(/This order changed/)).toBeVisible();
  expect(name).toHaveValue('Maya Cohen');
});

it('rejects an edit link for a shop member without edit permission', async () => {
  authState.role = 'member';
  mount();
  expect(await screen.findByText(/Only shop owners and admins/)).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
});
