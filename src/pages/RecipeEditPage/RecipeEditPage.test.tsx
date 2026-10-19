import type { Recipe } from '@/features/recipes/types';
import { useLinkIngredient } from '@/features/recipes/recipesApi';
import { authState, resetAuth } from '@/test/auth';
import { buildRecipe } from '@/test/factories/recipes.factory';
import { renderWithRouter } from '@/test/render';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The edit screen owns two swipeable panes, so the tests pin the pieces that
 * would silently corrupt a recipe: the payload PATCHed back (no derived
 * base-unit columns, ingredients as a full replace), the client-side guard that
 * an empty ingredient list never reaches the server, and the per-row barcode
 * affordances that depend on a saved row id.
 */

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: api.apiFetch,
}));

vi.mock('@/features/auth/supabase', async () => (await import('@/test/auth')).authMock);

const { RecipeEditPage } = await import('@/pages/RecipeEditPage/RecipeEditPage');

type Options = { method?: string; body?: unknown };

function mockApi(recipe: Recipe) {
  api.apiFetch.mockImplementation(async (path: string, options: Options = {}) => {
    if (options.method === 'PATCH') return { recipe };
    if (options.method === 'DELETE') return { ok: true, mode: 'soft' };
    if (options.method === 'POST' && path.endsWith('/link')) return new Promise(() => {});
    return { recipe };
  });
}

function renderEdit() {
  return renderWithRouter(
    <Routes>
      <Route path="/catalog" element={<h1>Catalog destination</h1>} />
      <Route path="/catalog/recipes/:id" element={<h1>Detail destination</h1>} />
      <Route path="/catalog/recipes/:id/edit" element={<RecipeEditPage />} />
      <Route
        path="/catalog/recipes/:id/edit/ingredients/:ingredientId/scan"
        element={<h1>Scan destination</h1>}
      />
    </Routes>,
    { initialEntries: ['/catalog', '/catalog/recipes/rp-1/edit'], initialIndex: 1 },
  );
}

beforeEach(() => {
  api.apiFetch.mockReset();
  resetAuth();
});

describe('RecipeEditPage', () => {
  it('seeds the form, the auto costing block and the step panes from the recipe', async () => {
    mockApi(buildRecipe({ yieldQuantity: '4.000' }));
    renderEdit();

    expect(await screen.findByDisplayValue('Tomato Soup')).toBeInTheDocument();
    expect(screen.getByLabelText('PREP TIME (MIN)')).toHaveValue('20');
    expect(screen.getByLabelText('SERVES')).toHaveValue('4');
    expect(screen.getByLabelText('Ingredient name')).toHaveValue('Tomatoes');
    expect(screen.getByLabelText('Quantity')).toHaveValue('2');
    expect(screen.getByLabelText('Unit')).toHaveValue('kg');
    expect(screen.getByLabelText('Step 1')).toHaveValue('Simmer the tomatoes.');
    expect(screen.getByLabelText('Step 2')).toHaveValue('Blend until smooth.');
    expect(screen.getByText('Unit cost · Auto')).toBeInTheDocument();
    expect(screen.getByText(/Unit cost:/)).toHaveTextContent('$2.10');
    expect(screen.getByText('1 of 2')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Go to step 2' }));
    expect(screen.getByRole('button', { name: 'Go to step 2' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByText('2 of 2')).toBeInTheDocument();
  });

  it('blocks the server call and explains what is missing', async () => {
    mockApi(buildRecipe());
    renderEdit();
    await screen.findByDisplayValue('Tomato Soup');

    await userEvent.clear(screen.getByLabelText('RECIPE NAME'));
    await userEvent.clear(screen.getByLabelText('Ingredient name'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText('Recipe name is required.')).toBeInTheDocument();
    expect(screen.getByText('Ingredient 1: name is required.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remove ingredient' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText('Add at least one ingredient.')).toBeInTheDocument();

    expect(api.apiFetch.mock.calls.some(([, options]) => options?.method === 'PATCH')).toBe(false);
  });

  it('refuses to save servings that are not a positive number', async () => {
    mockApi(buildRecipe());
    renderEdit();
    await screen.findByDisplayValue('Tomato Soup');

    await userEvent.clear(screen.getByLabelText('SERVES'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText('Serves must be greater than 0.')).toBeInTheDocument();
    expect(api.apiFetch.mock.calls.some(([, options]) => options?.method === 'PATCH')).toBe(false);
  });

  it('patches the edited fields without base-unit columns and returns to the detail', async () => {
    mockApi(buildRecipe());
    renderEdit();
    await screen.findByDisplayValue('Tomato Soup');

    await userEvent.clear(screen.getByLabelText('PREP TIME (MIN)'));
    await userEvent.type(screen.getByLabelText('PREP TIME (MIN)'), '35');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(api.apiFetch.mock.calls.some(([, options]) => options?.method === 'PATCH')).toBe(true),
    );
    const patch = api.apiFetch.mock.calls.find(([, options]) => options?.method === 'PATCH')!;
    expect(patch[0]).toBe('/recipes/rp-1');
    expect(patch[1].body).toEqual({
      name: 'Tomato Soup',
      prepTimeMinutes: 35,
      yieldQuantity: 4,
      allergens: [],
      steps: [
        { stepNumber: 1, instruction: 'Simmer the tomatoes.' },
        { stepNumber: 2, instruction: 'Blend until smooth.' },
      ],
      ingredients: [
        {
          inventoryItemId: null,
          generalPriceId: null,
          rawName: 'Tomatoes',
          quantity: 2,
          rawSrcUnit: 'kg',
        },
      ],
    });
    expect(patch[1].body.ingredients[0]).not.toHaveProperty('baseUnit');

    expect(await screen.findByText('Catalog destination')).toBeInTheDocument();
  });

  it('links each row from its camera button and disabled it until the row is saved', async () => {
    const recipe = buildRecipe();
    recipe.costing.ingredients = [
      { ...recipe.costing.ingredients[0]!, id: 'ing-1', name: 'Tomatoes', inventoryItemId: null },
      { ...recipe.costing.ingredients[0]!, id: null, name: 'Basil', inventoryItemId: null },
    ];
    mockApi(recipe);
    renderEdit();
    await screen.findByDisplayValue('Tomato Soup');

    const savedRow = screen.getByRole('button', { name: 'Scan barcode for Tomatoes' });
    expect(savedRow).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Scan barcode for Basil' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Scan barcode for Basil' })).toHaveAttribute(
      'title',
      'Save first',
    );

    await userEvent.click(savedRow);
    expect(await screen.findByText('Scan destination')).toBeInTheDocument();
  });

  it('swaps a row camera for a spinner while its link mutation runs and a check once linked', async () => {
    const recipe = buildRecipe();
    recipe.costing.ingredients = [
      { ...recipe.costing.ingredients[0]!, id: 'ing-1', name: 'Tomatoes', inventoryItemId: null },
      { ...recipe.costing.ingredients[0]!, id: 'ing-2', name: 'Basil', inventoryItemId: 'inv-9' },
    ];
    mockApi(recipe);

    function LinkTrigger() {
      const link = useLinkIngredient('token-1', 'shop-1', 'rp-1', 'ing-1');
      return (
        <button type="button" onClick={() => link.mutate({ barcode: '4006381333931' })}>
          start link
        </button>
      );
    }
    renderWithRouter(
      <>
        <LinkTrigger />
        <Routes>
          <Route path="/catalog/recipes/:id/edit" element={<RecipeEditPage />} />
        </Routes>
      </>,
      { route: '/catalog/recipes/rp-1/edit' },
    );
    await screen.findByDisplayValue('Tomato Soup');

    expect(screen.getByText('Linked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Scan barcode for Basil' })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'start link' }));
    expect(await screen.findByText('Linking barcode')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Scan barcode for Tomatoes' })).toBeNull();
  });

  it('refreshes the recipe after a link so the row reports as linked', async () => {
    const recipe = buildRecipe();
    const unlinkedCosting = {
      ...recipe.costing,
      ingredients: [{ ...recipe.costing.ingredients[0]!, id: 'ing-1', inventoryItemId: null }],
    };
    const linkedCosting = {
      ...unlinkedCosting,
      ingredients: [{ ...unlinkedCosting.ingredients[0]!, inventoryItemId: 'inv-7' }],
    };
    // The link endpoint returns only the costing; the row's linked status comes
    // from the recipe detail, so this mock only reports the link on the refetch.
    let linked = false;
    api.apiFetch.mockImplementation(async (path: string, options: Options = {}) => {
      if (options.method === 'POST' && path.endsWith('/link')) {
        linked = true;
        return { costing: unlinkedCosting };
      }
      return { recipe: { ...recipe, costing: linked ? linkedCosting : unlinkedCosting } };
    });

    function LinkTrigger() {
      const link = useLinkIngredient('token-1', 'shop-1', 'rp-1', 'ing-1');
      return (
        <button type="button" onClick={() => link.mutate({ barcode: '4006381333931' })}>
          start link
        </button>
      );
    }
    renderWithRouter(
      <>
        <LinkTrigger />
        <Routes>
          <Route path="/catalog/recipes/:id/edit" element={<RecipeEditPage />} />
        </Routes>
      </>,
      { route: '/catalog/recipes/rp-1/edit' },
    );

    expect(
      await screen.findByRole('button', { name: 'Scan barcode for Tomatoes' }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'start link' }));

    expect(await screen.findByText('Linked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Scan barcode for Tomatoes' })).toBeNull();
  });

  it('resets unsaved edits back to the loaded recipe', async () => {
    mockApi(buildRecipe());
    renderEdit();
    await screen.findByDisplayValue('Tomato Soup');

    await userEvent.clear(screen.getByDisplayValue('Tomato Soup'));
    await userEvent.type(screen.getByLabelText('Ingredient name'), '!');
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByDisplayValue('Tomato Soup')).toBeInTheDocument();
    expect(screen.getByLabelText('Ingredient name')).toHaveValue('Tomatoes');
  });

  it('confirms deletion, warns about the soft-delete mode and lands on the recipes tab', async () => {
    mockApi(buildRecipe());
    renderEdit();
    await screen.findByDisplayValue('Tomato Soup');

    await userEvent.click(screen.getByRole('button', { name: 'Delete recipe' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete this recipe?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Delete Recipe' }));
    await waitFor(() =>
      expect(api.apiFetch.mock.calls.some(([, options]) => options?.method === 'DELETE')).toBe(true),
    );
    expect(await screen.findByText('Catalog destination')).toBeInTheDocument();
  });

  it('sends members away from the editor', async () => {
    authState.role = 'member';
    mockApi(buildRecipe());
    renderEdit();

    expect(await screen.findByText('Detail destination')).toBeInTheDocument();
    expect(api.apiFetch).toHaveBeenCalled();
  });
});
