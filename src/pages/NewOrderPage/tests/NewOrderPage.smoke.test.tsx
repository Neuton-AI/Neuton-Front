import { resetAuth } from '@/test/auth';
import { createTestQueryClient, renderWithRouter } from '@/test/render';
import { act, screen, within } from '@testing-library/react';
import { recipesKeys } from '@/features/recipes/keys';
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
const renderPage = (queryClient = createTestQueryClient()) => renderWithRouter(<Routes>
  <Route path='/orders/new' element={<NewOrderPage />} />
  <Route path='/orders/:id' element={<h1>Saved order</h1>} />
  <Route path='/orders' element={<h1>Orders</h1>} />
</Routes>, { route: '/orders/new', queryClient });

it('prices locally and saves required fields through real HTTP', async () => {
  server.use(http.get(apiPath('/recipes'), () => HttpResponse.json({ recipes: [buildRecipe({ status: 'verified' })] })));
  const user = userEvent.setup();
  renderPage();
  expect(screen.getByRole('button', { name: 'Save order' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Add item' }));
  await user.click(await screen.findByRole('option', { name: 'Tomato Soup' }));
  await user.type(screen.getByLabelText('Customer name'), 'Ada');
  await user.type(screen.getByLabelText('Delivery address'), '12 Main St');
  expect(screen.queryByLabelText('Distance')).toBeNull();
  expect(screen.getByLabelText('Delivery date')).toHaveValue(screen.getByLabelText('Order date').getAttribute('value'));
  await user.click(screen.getByRole('button', { name: 'Save order' }));
  expect(await screen.findByRole('heading', { name: 'Saved order' })).toBeInTheDocument();
});

it.each(['0.00', '4.00'])('lets users select partial recipes with known unit price %s', async unitPrice => {
  const recipe = buildRecipe({ name: 'Brownies', status: 'verified', orderPricing: { unitPrice, unitCost: '0.0000', costComplete: false } });
  server.use(http.get(apiPath('/recipes'), () => HttpResponse.json({ recipes: [recipe] })));
  const user = userEvent.setup();
  renderPage();
  await user.click(screen.getByRole('button', { name: 'Add item' }));
  const option = await screen.findByRole('option', { name: 'Brownies' });
  expect(option).not.toHaveAttribute('aria-disabled', 'true');
  await user.click(option);
  expect(screen.queryByRole('combobox')).toBeNull();
  expect(screen.getByRole('button', { name: 'Save order' })).toBeEnabled();
});

it('confirms discarding edits, keeps the draft on cancel and restores focus to X', async () => {
  const user = userEvent.setup();
  renderPage();
  await user.type(await screen.findByLabelText('Customer name'), 'Ada');
  const close = screen.getByRole('button', { name: 'Close new order' });
  await user.click(close);
  const dialog = screen.getByRole('dialog', { name: 'Discard this order?' });
  expect(within(dialog).getByRole('button', { name: 'Keep editing' })).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByLabelText('Customer name')).toHaveValue('Ada');
  expect(close).toHaveFocus();
  await user.click(close);
  await user.click(screen.getByRole('button', { name: 'Discard order' }));
  expect(await screen.findByRole('heading', { name: 'Orders' })).toBeInTheDocument();
});

it('leaves a pristine draft immediately and uses a plain single-line address', async () => {
  const user = userEvent.setup();
  renderPage();
  expect(await screen.findByLabelText('Delivery address')).toHaveAttribute('type', 'text');
  await user.click(screen.getByRole('button', { name: 'Close new order' }));
  expect(await screen.findByRole('heading', { name: 'Orders' })).toBeInTheDocument();
});

it('confirms leaving selected items even when no form field was edited', async () => {
  server.use(http.get(apiPath('/recipes'), () => HttpResponse.json({ recipes: [buildRecipe({ status: 'verified' })] })));
  const user = userEvent.setup();
  renderPage();
  await user.click(screen.getByRole('button', { name: 'Add item' }));
  await user.click(await screen.findByRole('option', { name: 'Tomato Soup' }));
  await user.click(screen.getByRole('button', { name: 'Close new order' }));
  expect(screen.getByRole('dialog', { name: 'Discard this order?' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Keep editing' }));
  expect(screen.getByLabelText('Quantity of Tomato Soup')).toHaveTextContent('1');
});

it('filters locally, adds a result by keyboard and increments the same line when picked again', async () => {
  const catalog = [
    buildRecipe({ status: 'verified' }),
    buildRecipe({ id: 'cake', name: 'Honey Cake', status: 'verified' }),
    buildRecipe({ id: 'inactive', name: 'Inactive Cake', status: 'verified', isActive: false }),
  ];
  server.use(http.get(apiPath('/recipes'), () => HttpResponse.json({ recipes: catalog })));
  const user = userEvent.setup();
  renderPage();
  const trigger = screen.getByRole('button', { name: 'Add item' });
  await user.click(trigger);
  expect(await screen.findAllByRole('option')).toHaveLength(2);
  const search = screen.getByRole('combobox', { name: 'Search recipes' });
  expect(search).toHaveFocus();
  await user.type(search, 'cAkE');
  expect(screen.getAllByRole('option')).toHaveLength(1);
  await user.keyboard('{ArrowDown}{Enter}');
  expect(trigger).toHaveFocus();
  expect(screen.getByLabelText('Quantity of Honey Cake')).toHaveTextContent('1');
  await user.click(trigger);
  await user.click(screen.getByRole('option', { name: 'Honey Cake' }));
  expect(screen.getAllByLabelText('Quantity of Honey Cake')).toHaveLength(1);
  expect(screen.getByLabelText('Quantity of Honey Cake')).toHaveTextContent('2');
});

async function renderChangedCatalog() {
  const first = buildRecipe({ status: 'verified' });
  const second = buildRecipe({ id: 'cake', name: 'Honey Cake', status: 'verified' });
  const queryClient = createTestQueryClient();
  server.use(http.get(apiPath('/recipes'), () => HttpResponse.json({ recipes: [first, second] })));
  const user = userEvent.setup();
  renderPage(queryClient);
  await user.type(screen.getByLabelText('Customer name'), 'Ada');
  await user.type(screen.getByLabelText('Delivery address'), '12 Main St');
  const pick = async (name: string) => {
    await user.click(screen.getByRole('button', { name: 'Add item' }));
    await user.click(await screen.findByRole('option', { name }));
  };
  await pick(first.name);
  await pick(second.name);
  const update = (recipes: typeof first[]) => act(() => {
    queryClient.setQueryData(recipesKeys.recipes('shop-1'), { recipes });
  });
  update([{ ...first, isActive: false }, { ...second, orderPricing: { unitPrice: '25.00', unitCost: '4.0000', costComplete: true } }]);
  return { user, update, first, second };
}

it('keeps unavailable rows and both warnings, and submits exclusions only on confirmation', async () => {
  const { user, first, second } = await renderChangedCatalog();
  const writes = vi.fn();
  server.use(http.post(apiPath('/orders'), async ({ request }) => {
    writes(await request.json());
    return HttpResponse.json({ order: { id: 'saved' } });
  }));
  expect(await screen.findByText('some items are not available')).toBeInTheDocument();
  expect(screen.getByText('Some item prices have changed')).toBeInTheDocument();
  expect(screen.getByLabelText('Quantity of Tomato Soup')).toHaveTextContent('1');
  expect(screen.getByRole('button', { name: 'Remove one Tomato Soup' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Remove Tomato Soup' })).toBeEnabled();
  expect(within(screen.getByRole('region', { name: 'Order breakdown' })).getAllByText('$25.00')).toHaveLength(2);
  const save = screen.getByRole('button', { name: 'Save order' });
  await user.click(save);
  const dialog = screen.getByRole('dialog', { name: 'Save without unavailable items?' });
  expect(within(dialog).getByRole('button', { name: 'Go back' })).toHaveFocus();
  await user.tab({ shift: true });
  expect(within(dialog).getByRole('button', { name: 'Save order' })).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(save).toHaveFocus();
  expect(writes).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Customer name')).toHaveValue('Ada');
  await user.click(save);
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save order' }));
  expect(await screen.findByRole('heading', { name: 'Saved order' })).toBeInTheDocument();
  expect(writes).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
    confirmedUnavailableRecipeIds: [first.id],
    items: [
      expect.objectContaining({ recipeId: first.id, quantity: 1 }),
      { recipeId: second.id, quantity: 1, expectedUnitPrice: '25.00' },
    ],
  }));
});

it('blocks all-unavailable saves and restores a reactivated selection', async () => {
  const { user, update, first, second } = await renderChangedCatalog();
  const writes = vi.fn();
  server.use(http.post(apiPath('/orders'), () => {
    writes();
    return HttpResponse.json({ order: { id: 'saved' } });
  }));
  update([{ ...first, isActive: false }, { ...second, isActive: false }]);
  await screen.findByText('some items are not available');
  await user.click(screen.getByRole('button', { name: 'Save order' }));
  expect(screen.getByText('No available items to save')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(writes).not.toHaveBeenCalled();
  update([first, second]);
  await screen.findByRole('button', { name: 'Remove one Tomato Soup' });
  expect(screen.getByRole('button', { name: 'Remove one Tomato Soup' })).toBeEnabled();
  expect(screen.getByLabelText('Quantity of Tomato Soup')).toHaveTextContent('1');
  expect(screen.queryByText('some items are not available')).toBeNull();
});
