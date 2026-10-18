import type { Recipe, RecipeStatus } from '@/features/recipes/types';
import { buildRecipe } from '@/test/factories/recipes.factory';
import { renderWithRouter } from '@/test/render';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * An extracted recipe also rests at `unverified`, and while it sits there it is
 * invisible to GET /recipes/orderable - no order can contain it. These tests
 * pin that the detail sheet offers the publish step to owner/admin, sends a
 * valid body to the recipe verify endpoint, and drops the action afterwards.
 */

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: api.apiFetch,
}));

const state = vi.hoisted(() => ({ role: 'owner' as 'owner' | 'admin' | 'member' }));

vi.mock('@/features/auth/supabase', async () => {
  const { buildShop } = await import('@/test/factories/shops.factory');
  const shop = buildShop();
  return {
    supabase: null,
    isSupabaseConfigured: false,
    useAuth: () => ({
      session: null,
      loading: false,
      user: { id: 'u1' },
      token: 'token-1',
    }),
    useShopMemberships: () => ({
      memberships: [{ shopId: 'shop-1', role: state.role, shops: shop }],
      activeShopId: 'shop-1',
      loading: false,
      error: null,
      setActiveShopId: vi.fn(),
      reload: vi.fn(),
    }),
    useCurrentShop: () => shop,
  };
});

const { RecipeDetailPage } = await import('@/pages/RecipeDetailPage/RecipeDetailPage');

function makeRecipe(status: RecipeStatus): Recipe {
  return buildRecipe({ status });
}

/** Answers GET /recipes/:id from a status the verify mock can move forward. */
function mockApi() {
  const current = { status: 'unverified' as RecipeStatus };

  api.apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/recipes/') && path.endsWith('/verify')) {
      current.status = 'verified';
      return { recipe: makeRecipe('verified') };
    }
    return { recipe: makeRecipe(current.status) };
  });

  return current;
}

beforeEach(() => {
  api.apiFetch.mockReset();
  state.role = 'owner';
});

/** The sheet reads `:id` off the route, so it needs a real route to mount on. */
function renderDetail() {
  return renderWithRouter(
    <Routes>
      <Route path="/catalog" element={<h1>Catalog destination</h1>} />
      <Route path="/catalog/recipes/:id" element={<RecipeDetailPage />} />
    </Routes>,
    { route: '/catalog/recipes/rp-1' },
  );
}

describe('RecipeDetailPage verification', () => {
  it('recognizes a supermarket price link when the server omits linked counters and flags', async () => {
    const recipe = makeRecipe('unverified');
    recipe.costing.ingredients[0]!.inventoryItemId = null;
    recipe.costing.ingredients[0]!.generalPriceId = 'price-1';
    api.apiFetch.mockResolvedValue({ recipe });
    renderDetail();
    expect(await screen.findByLabelText('Linked to inventory')).toBeInTheDocument();
    expect(screen.queryByLabelText('Not linked to inventory')).toBeNull();
    expect(screen.queryByText('Unlinked')).toBeNull();
  });

  it('offers the verify action on an unverified recipe', async () => {
    mockApi();
    renderDetail();

    expect(await screen.findByRole('button', { name: 'Verify recipe' })).toBeInTheDocument();
    expect(screen.getByText(/Verify it to publish the recipe for orders/i)).toBeInTheDocument();
  });

  it('hides the verify action once the recipe is verified', async () => {
    const current = mockApi();
    current.status = 'verified';
    renderDetail();

    await screen.findByText('Verified');
    expect(screen.queryByRole('button', { name: 'Verify recipe' })).toBeNull();
  });

  it('hides the verify action from members, who would only get a 403', async () => {
    state.role = 'member';
    mockApi();
    renderDetail();

    await screen.findByText('Needs review');
    expect(screen.queryByRole('button', { name: 'Verify recipe' })).toBeNull();
  });

  it('calls the verify endpoint and flips the sheet to verified', async () => {
    const user = userEvent.setup();
    mockApi();
    renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Verify recipe' }));

    await waitFor(() =>
      expect(api.apiFetch).toHaveBeenCalledWith(
        '/recipes/rp-1/verify',
        expect.objectContaining({
          method: 'POST',
          shopId: 'shop-1',
          // Every field of the body is optional, but the endpoint still parses
          // an object - a bodyless POST would come back as a 400.
          body: {},
        }),
      ),
    );
    expect(await screen.findByText('Verified')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verify recipe' })).toBeNull();
  });

  it('keeps the button in place and explains a failed verify', async () => {
    const user = userEvent.setup();
    api.apiFetch.mockImplementation(async (path: string) => {
      if (path.startsWith('/recipes/') && path.endsWith('/verify')) {
        throw new Error('Recipe is already verified');
      }
      return { recipe: makeRecipe('unverified') };
    });
    renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Verify recipe' }));

    expect(await screen.findByText('Recipe is already verified')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify recipe' })).toBeEnabled();
  });
});

describe('RecipeDetailPage delete', () => {
  it('offers the delete action to owners on every status (no status gate)', async () => {
    mockApi();
    renderDetail();

    // Verified recipes are deletable too — the backend try-hard →
    // fallback-soft path decides hard vs soft, not the UI.
    expect(await screen.findByRole('button', { name: 'Delete recipe' })).toBeEnabled();
  });

  it('hides the delete action from members, who would only get a 403', async () => {
    state.role = 'member';
    mockApi();
    renderDetail();

    await screen.findByText('Tomato Soup');
    expect(screen.queryByRole('button', { name: 'Delete recipe' })).toBeNull();
  });

  it('calls DELETE /recipes/:id after confirmation', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockApi();
    renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Delete recipe' }));

    await waitFor(() =>
      expect(api.apiFetch).toHaveBeenCalledWith(
        '/recipes/rp-1',
        expect.objectContaining({ method: 'DELETE', shopId: 'shop-1' }),
      ),
    );
    expect(await screen.findByRole('heading', { name: 'Catalog destination' })).toBeInTheDocument();
    confirm.mockRestore();
  });

  it('explains a failed delete inline without navigating away', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.apiFetch.mockImplementation(async (_path: string, init?: { method?: string }) => {
      if (init?.method === 'DELETE') throw new Error('Could not delete the recipe.');
      return { recipe: makeRecipe('verified') };
    });
    renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Delete recipe' }));

    expect(await screen.findByText('Could not delete the recipe.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete recipe' })).toBeEnabled();
  });
});

it('shows incomplete costs instead of formatting unresolved totals as zero', async () => {
  const recipe = makeRecipe('verified');
  Object.assign(recipe.costing, { costComplete: false, unitCost: null, batchCost: null, retailPrice: null, linkedCount: 0, totalCount: 1 });
  Object.assign(recipe.costing.ingredients[0]!, { linked: false, lineCost: null, averageUnitCost: null });
  api.apiFetch.mockResolvedValue({ recipe });
  renderDetail();
  expect(await screen.findByText(/Unit cost Incomplete/)).toBeInTheDocument();
  expect(screen.getByText(/cost incomplete/)).toBeInTheDocument();
  expect(screen.getByText(/Resolved ingredients/)).toBeInTheDocument();
});
