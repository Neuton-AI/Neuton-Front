import { useFabNavigation, type MediaKind } from '@/components/Fab/Fab.module';
import { useAuth, useCurrentShop, useShopMemberships } from '@/features/auth/supabase';
import { useInventory } from '@/features/inventory/inventoryApi';
import { useReceipts } from '@/features/receipts/receiptsApi';
import { useRecipes } from '@/features/recipes/recipesApi';
import { ingredientLinkSummary } from '@/features/recipes/selectors';
import { useLocation, useSearchParams } from 'react-router-dom';
type Tab = 'recipes' | 'receipts' | 'inventory';

const TABS: { key: Tab; label: string }[] = [
  { key: 'recipes', label: 'Recipes' },
  { key: 'receipts', label: 'Receipts' },
  { key: 'inventory', label: 'Inventory' },
];

const TAB_TO_KIND: Record<Tab, MediaKind> = {
  recipes: 'recipe',
  inventory: 'receipt',
  receipts: 'receipt',
};
export function useCatalogPage() {
  const location = useLocation();
  const { user, token } = useAuth();

  const { memberships, activeShopId } = useShopMemberships(user?.id);

  const shop = useCurrentShop(memberships, activeShopId);

  // The tab lives in the URL so Capture can deep-link back to receipts.
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedTab = searchParams.get('tab');

  const tab: Tab = TABS.some((t) => t.key === requestedTab) ? (requestedTab as Tab) : 'recipes';

  const fabNavigation = useFabNavigation(TAB_TO_KIND[tab]);

  // Each tab is its own query, enabled only while visible: `/recipes` costs
  // every recipe against live inventory, so fetching all three on mount is both
  // wasteful and the reason one 404 could discard a successful receipts response.
  const recipesQuery = useRecipes(token, activeShopId, tab === 'recipes');

  const inventoryQuery = useInventory(token, activeShopId, tab === 'inventory');

  const receiptsQuery = useReceipts(token, activeShopId, tab === 'receipts');

  const recipes = (recipesQuery.data?.recipes ?? []).map((recipe) => ({
    ...recipe,
    ...ingredientLinkSummary(recipe.costing),
  }));

  const inventory = inventoryQuery.data?.items ?? [];

  const receipts = receiptsQuery.data?.receipts ?? [];

  /** Errors are per tab: one failing list must not blank the others. */
  const errors: Partial<Record<Tab, string>> = {};

  for (const [which, query] of [
    ['recipes', recipesQuery],
    ['inventory', inventoryQuery],
    ['receipts', receiptsQuery],
  ] as const) {
    if (query.error) {
      errors[which] =
        query.error instanceof Error ? query.error.message : 'Could not load this list';
    }
  }

  const loadingTab: Tab | null =
    tab === 'recipes'
      ? recipesQuery.isLoading
        ? 'recipes'
        : null
      : tab === 'inventory'
        ? inventoryQuery.isLoading
          ? 'inventory'
          : null
        : receiptsQuery.isLoading
          ? 'receipts'
          : null;

  const refetchTab = (which: Tab) => {
    const query =
      which === 'recipes' ? recipesQuery : which === 'inventory' ? inventoryQuery : receiptsQuery;
    void query.refetch();
  };

  const currency = shop?.currency ?? 'USD';

  /** The inventory grid only replaces the row stack once it has tiles to place. */
  const showInventoryGrid =
    tab === 'inventory' && !errors.inventory && loadingTab !== 'inventory' && inventory.length > 0;
  const handleSelectTab = (key: Tab) => setSearchParams(key === 'recipes' ? {} : { tab: key });
  return {
    recipeNavigationState: {
      recipeReturnTo: `${location.pathname}${location.search}${location.hash}`,
    },
    shop,
    tab,
    fabNavigation,
    recipes,
    inventory,
    receipts,
    errors,
    loadingTab,
    refetchTab,
    currency,
    showInventoryGrid,
    handleSelectTab,
  };
}
export type CatalogPageModel = ReturnType<typeof useCatalogPage>;
