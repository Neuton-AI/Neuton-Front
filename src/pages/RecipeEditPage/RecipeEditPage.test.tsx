import { authState, resetAuth } from '@/test/auth';
import { buildRecipe } from '@/test/factories/recipes.factory';
import { buildShop } from '@/test/factories/shops.factory';
import { apiPath } from '@/test/mocks/handlers/context';
import { server } from '@/test/mocks/server';
import { renderWithRouter } from '@/test/render';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { RecipeEditPage } from './RecipeEditPage';

vi.mock('@/features/auth/supabase', async () => (await import('@/test/auth')).authMock);
vi.mock('@/components/BarcodeScanner/BarcodeScanner', () => ({
  BarcodeScanner: ({
    onDetected,
    onClose,
    error,
  }: {
    onDetected: (barcode: string) => void;
    onClose: () => void;
    error?: string;
  }) => (
    <div role="dialog" aria-label="Barcode scanner">
      <button onClick={() => onDetected('7290000000001')}>Scan product</button>
      <button onClick={onClose}>Cancel scan</button>
      {error}
    </div>
  ),
}));

beforeEach(resetAuth);

function renderEditor() {
  const recipe = buildRecipe();
  recipe.costing.ingredients[0] = {
    ...recipe.costing.ingredients[0]!,
    id: 'ingredient-1',
    rawName: 'Original tomatoes',
    rawMaterialName: 'Tomato',
    quantity: 2,
    rawSrcUnit: 'kg',
    generalPriceId: 'old-unresolved-price',
    linked: false,
  };
  server.use(http.get(apiPath('/recipes/rp-1'), () => HttpResponse.json({ recipe })));
  return renderWithRouter(
    <Routes>
      <Route path="/catalog/recipes/:id/edit" element={<RecipeEditPage />} />
      <Route path="/catalog/recipes/:id" element={<h1>Recipe destination</h1>} />
      <Route path="/catalog" element={<h1>Catalog destination</h1>} />
    </Routes>,
    { route: '/catalog/recipes/rp-1/edit?ingredient=ingredient-1' },
  );
}

it('keeps one draft across swipes and tabs, resets edits, and focuses the requested ingredient', async () => {
  const user = userEvent.setup();
  renderEditor();
  const name = await screen.findByLabelText('Ingredient 1 name');
  await waitFor(() => expect(name).toHaveFocus());
  expect(name).toHaveValue('Original tomatoes');
  fireEvent.change(screen.getByLabelText('RECIPE NAME'), { target: { value: 'Changed recipe' } });
  const panes = name.closest('fieldset')!;
  fireEvent.touchStart(panes, { touches: [{ clientX: 300, clientY: 100 }] });
  fireEvent.touchEnd(panes, { changedTouches: [{ clientX: 100, clientY: 104 }] });
  expect(screen.getByRole('tab', { name: '2 of 2 · Preparation' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await user.click(screen.getByRole('button', { name: 'Gluten' }));
  await user.click(screen.getByRole('tab', { name: '1 of 2 · Ingredients' }));
  expect(screen.getByLabelText('RECIPE NAME')).toHaveValue('Changed recipe');
  await user.click(screen.getByRole('button', { name: 'Reset' }));
  expect(screen.getByLabelText('RECIPE NAME')).toHaveValue('Tomato Soup');
  await user.click(screen.getByRole('tab', { name: '2 of 2 · Preparation' }));
  expect(screen.getByRole('button', { name: 'Gluten' })).toHaveAttribute('aria-pressed', 'false');
});

it('links an explicitly unresolved price without replacing original ingredient fields, then saves the draft', async () => {
  const user = userEvent.setup();
  let barcodeBody: unknown;
  let savedBody: unknown;
  server.use(
    http.post(apiPath('/recipes/rp-1/barcode-price'), async ({ request }) => {
      barcodeBody = await request.json();
      return HttpResponse.json({
        price: {
          id: 'price-1',
          rawName: 'Supermarket tomato pack',
          quantity: 500,
          rawSrcUnit: 'g',
        },
      });
    }),
    http.patch(apiPath('/recipes/rp-1'), async ({ request }) => {
      savedBody = await request.json();
      return HttpResponse.json({ recipe: { id: 'rp-1' } });
    }),
  );
  renderEditor();
  await user.click(await screen.findByRole('button', { name: 'Scan barcode for ingredient 1' }));
  await user.click(screen.getByRole('button', { name: 'Scan product' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(barcodeBody).toEqual({
    barcode: '7290000000001',
    rawMaterialName: 'Tomato',
    quantity: 2,
    rawSrcUnit: 'kg',
  });
  expect(screen.getByLabelText('Ingredient 1 name')).toHaveValue('Original tomatoes');
  expect(screen.getByLabelText('Ingredient 1 amount')).toHaveValue(2);
  expect(screen.getByLabelText('Ingredient 1 unit')).toHaveValue('kg');
  expect(screen.queryByRole('button', { name: 'Scan barcode for ingredient 1' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByText('Recipe destination')).toBeInTheDocument();
  expect(savedBody).toMatchObject({
    ingredients: [
      {
        rawName: 'Original tomatoes',
        rawMaterialName: 'Tomato',
        quantity: 2,
        rawSrcUnit: 'kg',
        inventoryItemId: null,
        generalPriceId: 'price-1',
      },
    ],
  });
  expect((savedBody as { ingredients: object[] }).ingredients[0]).not.toHaveProperty('linked');
  expect((savedBody as { ingredients: object[] }).ingredients[0]).not.toHaveProperty(
    'baseUnitAmount',
  );
});

it('keeps failed scans open for retry and preserves draft edits on cancel', async () => {
  const user = userEvent.setup();
  server.use(
    http.post(apiPath('/recipes/rp-1/barcode-price'), () =>
      HttpResponse.json({ error: { message: 'Product not found' } }, { status: 404 }),
    ),
  );
  renderEditor();
  fireEvent.change(await screen.findByLabelText('RECIPE NAME'), {
    target: { value: 'Draft stays' },
  });
  await user.click(screen.getByRole('button', { name: 'Scan barcode for ingredient 1' }));
  await user.click(screen.getByRole('button', { name: 'Scan product' }));
  expect(await screen.findByText('Product not found')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Cancel scan' }));
  expect(screen.getByLabelText('RECIPE NAME')).toHaveValue('Draft stays');
  expect(screen.getByRole('button', { name: 'Scan barcode for ingredient 1' })).toBeInTheDocument();
});

it('keeps an unsuccessful save in the editor and validates missing ingredients', async () => {
  const user = userEvent.setup();
  const save = vi.fn(() =>
    HttpResponse.json({ error: { message: 'Save failed' } }, { status: 500 }),
  );
  server.use(http.patch(apiPath('/recipes/rp-1'), save));
  renderEditor();
  await user.click(await screen.findByRole('button', { name: 'Save changes' }));
  expect(await screen.findByText('Save failed')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Remove ingredient 1' }));
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(screen.getByText(/at least one ingredient/)).toBeInTheDocument();
  expect(save).toHaveBeenCalledTimes(1);
});

it('hides editing and scanning for members', async () => {
  authState.role = 'member';
  renderEditor();
  expect(
    await screen.findByText('Only shop owners and admins can edit recipes.'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
  expect(screen.queryByRole('button', { name: /Scan barcode/ })).toBeNull();
});

it('uses canonical shop settings for labor when membership shop fields are unavailable', async () => {
  const user = userEvent.setup();
  server.use(
    http.get(apiPath('/shop'), () =>
      HttpResponse.json({ shop: buildShop({ hourlyLaborCost: '18' }) }),
    ),
  );
  renderEditor();
  fireEvent.change(await screen.findByLabelText('PREP TIME · MIN'), { target: { value: '30' } });
  await user.click(screen.getByRole('tab', { name: '2 of 2 · Preparation' }));
  await waitFor(() => expect(screen.getByLabelText('LABOR · AUTO')).toHaveValue('$9.00'));
});

it('waits for membership loading before showing permissions or missing recipe messages', async () => {
  authState.loading = true;
  authState.hasMembership = false;
  renderEditor();
  await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
  expect(screen.queryByText('Only shop owners and admins can edit recipes.')).toBeNull();
  expect(screen.queryByText('Recipe not found.')).toBeNull();
});

it('deletes through the existing delete endpoint after confirmation', async () => {
  const user = userEvent.setup();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  server.use(
    http.delete(apiPath('/recipes/rp-1'), () => HttpResponse.json({ ok: true, mode: 'hard' })),
  );
  renderEditor();
  await user.click(await screen.findByRole('button', { name: 'Delete recipe' }));
  expect(await screen.findByText('Catalog destination')).toBeInTheDocument();
});
