import { RecipeDetailPage } from '@/pages/RecipeDetailPage/RecipeDetailPage';
import { RecipeEditPage } from '@/pages/RecipeEditPage/RecipeEditPage';
import { resetAuth } from '@/test/auth';
import { buildRecipe } from '@/test/factories/recipes.factory';
import { apiPath } from '@/test/mocks/handlers/context';
import { server } from '@/test/mocks/server';
import { renderWithRouter } from '@/test/render';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('@/features/auth/supabase', async () => (await import('@/test/auth')).authMock);
vi.mock('@/components/BarcodeScanner/BarcodeScanner', () => ({
  BarcodeScanner: ({
    onClose,
    onManualSave,
  }: {
    onClose: () => void;
    onManualSave: (product: {
      name: string;
      price: number;
      packageSize: number;
      packageUnit: 'kg';
    }) => void;
  }) => (
    <div role="dialog" aria-label="Barcode scanner">
      <button onClick={onClose}>Cancel scan</button>
      <button
        onClick={() =>
          onManualSave({
            name: 'Linked tomatoes',
            price: 10,
            packageSize: 1,
            packageUnit: 'kg',
          })
        }
      >
        Save manual product
      </button>
    </div>
  ),
}));

const catalog = '/catalog?tab=recipes&search=tomato';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="Route">{location.pathname + location.search}</output>
      <button onClick={() => navigate(-1)}>Browser back</button>
      {location.pathname === '/catalog' ? (
        <button
          onClick={() =>
            navigate('/catalog/recipes/rp-1', {
              state: { recipeReturnTo: catalog },
            })
          }
        >
          Open recipe
        </button>
      ) : null}
    </>
  );
}

function renderRecipeFlow(route = catalog) {
  let recipe = buildRecipe();
  recipe.costing.ingredients[0] = {
    ...recipe.costing.ingredients[0],
    id: 'ingredient-1',
    rawName: 'Tomatoes',
    rawMaterialName: 'Tomato',
    linked: false,
  };
  const save = vi.fn(async ({ request }: { request: Request }) => {
    const body = await request.json();
    recipe = {
      ...recipe,
      name: body.name,
      costing: {
        ...recipe.costing,
        ingredients: body.ingredients.map((ingredient: object) => ({
          ...recipe.costing.ingredients[0],
          ...ingredient,
          linked: 'inventoryItemId' in ingredient && !!ingredient.inventoryItemId,
        })),
      },
    };
    return HttpResponse.json({ recipe });
  });
  server.use(
    http.get(apiPath('/recipes/rp-1'), () => HttpResponse.json({ recipe })),
    http.patch(apiPath('/recipes/rp-1'), save),
    http.post(apiPath('/recipes/rp-1/manual-product'), () =>
      HttpResponse.json({
        product: {
          id: 'manual-1',
          name: 'Linked tomatoes',
          rawMaterialName: 'Tomato',
        },
      }),
    ),
  );
  renderWithRouter(
    <>
      <Navigation />
      <Routes>
        <Route path="/catalog/recipes/:id" element={<RecipeDetailPage />} />
        <Route path="/catalog/recipes/:id/edit" element={<RecipeEditPage />} />
        <Route path="*" element={<p>Catalog</p>} />
      </Routes>
    </>,
    { initialEntries: ['/dashboard', route], initialIndex: 1 },
  );
  return save;
}

beforeEach(() => resetAuth());

it('closes a directly opened editor through details to the recipes catalog', async () => {
  const user = userEvent.setup();
  renderRecipeFlow('/catalog/recipes/rp-1/edit');
  await screen.findByLabelText('RECIPE NAME');
  await user.click(screen.getByRole('button', { name: 'Close recipe editor' }));
  await screen.findByRole('heading', { name: 'Tomato Soup' });
  expect(screen.getByLabelText('Route').textContent).toBe('/catalog/recipes/rp-1');
  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.getByLabelText('Route').textContent).toBe('/catalog?tab=recipes');
  await user.click(screen.getByRole('button', { name: 'Browser back' }));
  expect(screen.getByLabelText('Route').textContent).toBe('/dashboard');
});

it('saves real editor changes, closes details to the catalog, and never reopens the editor on Back', async () => {
  const user = userEvent.setup();
  const save = renderRecipeFlow();
  await user.click(screen.getByRole('button', { name: 'Open recipe' }));
  await user.click(await screen.findByRole('button', { name: 'Edit Recipe' }));
  fireEvent.change(await screen.findByLabelText('RECIPE NAME'), {
    target: { value: 'Updated soup' },
  });
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('heading', { name: 'Updated soup' })).toBeInTheDocument();
  expect(save).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.getByLabelText('Route').textContent).toBe(catalog);
  await user.click(screen.getByRole('button', { name: 'Browser back' }));
  expect(screen.getByLabelText('Route').textContent).toBe(catalog);
});

it('cancels and completes ingredient linking through the real pages without accumulating recipe history', async () => {
  const user = userEvent.setup();
  const save = renderRecipeFlow();
  await user.click(screen.getByRole('button', { name: 'Open recipe' }));
  await user.click(await screen.findByRole('button', { name: 'Link Tomatoes' }));
  expect(screen.getByLabelText('Route').textContent).toBe(
    '/catalog/recipes/rp-1/edit?ingredient=0',
  );
  const ingredient = await screen.findByLabelText('Ingredient 1 name');
  await waitFor(() => expect(ingredient).toHaveFocus());
  await user.click(screen.getByRole('button', { name: 'Scan barcode for ingredient 1' }));
  await user.click(screen.getByRole('button', { name: 'Cancel scan' }));
  expect(save).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Scan barcode for ingredient 1' }));
  await user.click(screen.getByRole('button', { name: 'Save manual product' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Barcode scanner' })).toBeNull());
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByLabelText('Linked to inventory')).toBeInTheDocument();
  expect(save).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.getByLabelText('Route').textContent).toBe(catalog);
  await user.click(screen.getByRole('button', { name: 'Browser back' }));
  expect(screen.getByLabelText('Route').textContent).toBe(catalog);
});

vi.mock('@/features/sync/documentsApi', async () => ({ documentFetch: (await import('@/lib/api')).apiFetch }));
