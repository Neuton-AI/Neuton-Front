import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Recipe, RecipeStatus } from '../lib/api';
import { renderWithRouter } from '../test/render';

/**
 * An extracted recipe also rests at `unverified`, and while it sits there it is
 * invisible to GET /recipes/orderable - no order can contain it. These tests
 * pin that the detail sheet offers the publish step to owner/admin, sends a
 * valid body to the unified verify endpoint, and drops the action afterwards.
 */

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  apiFetch: api.apiFetch,
}));

const state = vi.hoisted(() => ({ role: 'owner' as 'owner' | 'admin' | 'member' }));

vi.mock('../lib/supabase', () => {
  const shop = {
    id: 'shop-1',
    name: 'testShop',
    slug: 'test-shop',
    currency: 'USD',
    timezone: 'UTC',
    storeAddress: null,
    targetProfitMargin: '30',
    hourlyLaborCost: '0',
    deliveryBaseFee: '0',
    deliveryRatePerKm: '0',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
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

const { RecipeDetailPage } = await import('./RecipeDetailPage');

function makeRecipe(status: RecipeStatus): Recipe {
  return {
    id: 'rp-1',
    shopId: 'shop-1',
    name: 'Tomato Soup',
    description: null,
    imageUrl: null,
    categoryId: null,
    prepTimeMinutes: 20,
    yieldQuantity: '4',
    yieldUnit: 'servings',
    targetMarginPct: '30',
    allergens: null,
    instructions: 'Simmer the tomatoes.\nBlend until smooth.',
    isActive: true,
    status,
    createdAt: '2026-02-10T09:00:00.000Z',
    updatedAt: '2026-02-10T09:00:00.000Z',
    costing: {
      ingredientsCost: 6.4,
      laborCost: 2,
      batchCost: 8.4,
      unitCost: 2.1,
      yieldQuantity: 4,
      retailPrice: 10.5,
      appliedProfitMargin: 30,
      inStock: true,
      ingredients: [
        {
          name: 'Tomatoes',
          quantity: 2,
          unit: 'kg',
          averageUnitCost: 1.5,
          lineCost: 3,
          currentQuantity: 8,
        },
      ],
    },
  };
}

/** Answers GET /recipes/:id from a status the verify mock can move forward. */
function mockApi() {
  const current = { status: 'unverified' as RecipeStatus };

  api.apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/catalog/recipe/')) {
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
      <Route path="/catalog/recipes/:id" element={<RecipeDetailPage />} />
    </Routes>,
    { route: '/catalog/recipes/rp-1' },
  );
}

describe('RecipeDetailPage verification', () => {
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
        '/catalog/recipe/rp-1/verify',
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
      if (path.startsWith('/catalog/recipe/')) {
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
