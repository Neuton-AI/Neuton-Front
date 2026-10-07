import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { Fab, useFabNavigation, type MediaKind } from '../components/Fab';
import {
  EmptyState,
  ErrorState,
  InlineNotice,
  Skeleton,
} from '../components/feedback';
import { PageHeader } from '../components/PageHeader';
import { IconBox, IconChefHat, IconPlus, IconReceipt } from '../components/icons';
import { apiFetch, type InventoryItem, type Receipt, type Recipe } from '../lib/api';
import {
  getReceiptStatusLabel,
  RECEIPT_STATUS_PILL_STYLES,
} from '../lib/receiptStatus';
import { formatDate, formatMoney, formatQuantity, relativeTime } from '../lib/format';
import { useAuth, useCurrentShop, useShopMemberships } from '../lib/supabase';

type Tab = 'recipes' | 'inventory' | 'receipts';

const TABS: { key: Tab; label: string; Icon: typeof IconChefHat }[] = [
  { key: 'recipes', label: 'Recipes', Icon: IconChefHat },
  { key: 'inventory', label: 'Inventory', Icon: IconBox },
  { key: 'receipts', label: 'Receipts', Icon: IconReceipt },
];

const TAB_TO_KIND: Record<Tab, MediaKind> = {
  recipes: 'recipe',
  inventory: 'receipt',
  receipts: 'receipt',
};

export function CatalogPage() {
  const { user, token } = useAuth();
  const { memberships, activeShopId } = useShopMemberships(user?.id);
  const shop = useCurrentShop(memberships, activeShopId);

  // The tab lives in the URL so Capture can deep-link back to receipts.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const tab: Tab = TABS.some((t) => t.key === requestedTab)
    ? (requestedTab as Tab)
    : 'recipes';

  const fabNavigation = useFabNavigation(TAB_TO_KIND[tab]);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  /** Errors are per tab: one failing list must not blank the others. */
  const [errors, setErrors] = useState<Partial<Record<Tab, string>>>({});
  const [loadingTab, setLoadingTab] = useState<Tab | null>(null);
  const loadedTabs = useRef<Partial<Record<Tab, boolean>>>({});
  /** In-flight requests, so a concurrent mount joins instead of double-fetching. */
  const inFlight = useRef<Partial<Record<Tab, Promise<void>>>>({});

  /**
   * Loads only the visible tab. `/recipes` costs every recipe against live
   * inventory, so fetching all three on mount was both wasteful and the reason
   * one 404 could discard a successful receipts response.
   */
  const loadTab = useCallback(
    async (which: Tab, { force = false }: { force?: boolean } = {}) => {
      if (!token || !activeShopId) return;
      if (loadedTabs.current[which] && !force) return;
      // Join a request already in flight instead of issuing a duplicate.
      const existing = inFlight.current[which];
      if (existing && !force) return existing;

      setLoadingTab(which);
      setErrors((prev) => ({ ...prev, [which]: undefined }));

      const request = (async () => {
        try {
          if (which === 'recipes') {
            const data = await apiFetch<{ recipes: Recipe[] }>('/recipes?includeUnverified=true', {
              token,
              shopId: activeShopId,
            });
            setRecipes(data.recipes);
          } else if (which === 'inventory') {
            const data = await apiFetch<{ items: InventoryItem[] }>('/inventory', {
              token,
              shopId: activeShopId,
            });
            setInventory(data.items);
          } else {
            const data = await apiFetch<{ receipts: Receipt[] }>('/receipts?limit=50', {
              token,
              shopId: activeShopId,
            });
            setReceipts(data.receipts);
          }
          loadedTabs.current[which] = true;
        } catch (cause) {
          setErrors((prev) => ({
            ...prev,
            [which]:
              cause instanceof Error ? cause.message : 'Could not load this list',
          }));
        } finally {
          setLoadingTab((prev) => (prev === which ? null : prev));
        }
      })();

      inFlight.current[which] = request;
      try {
        await request;
      } finally {
        delete inFlight.current[which];
      }
    },
    [token, activeShopId],
  );

  // Quiet 3s poll while any recipe is pending/processing (no skeleton flash).
  useEffect(() => {
    if (tab !== 'recipes') return;
    const hasPending = recipes.some((r) => r.status === 'pending' || r.status === 'processing');
    if (!hasPending) return;

    const interval = setInterval(() => {
      void loadTab('recipes', { force: true });
    }, 3000);
    return () => clearInterval(interval);
  }, [recipes, tab, loadTab]);

  useEffect(() => {
    void loadTab(tab);
  }, [tab, loadTab]);

  const currency = shop?.currency ?? 'USD';

  /** The inventory grid only replaces the row stack once it has tiles to place. */
  const showInventoryGrid =
    tab === 'inventory' &&
    !errors.inventory &&
    loadingTab !== 'inventory' &&
    inventory.length > 0;

  return (
    <div className="shell">
      <div className="flex-1 pb-32 pt-[max(var(--safe-top)+44px,44px)]">
        <div className="px-4">
          <PageHeader eyebrow={shop?.name} title="Catalog" />
        </div>

        <div
          role="tablist"
          aria-label="Catalog section"
          className="no-scrollbar mt-4 flex gap-1.5 overflow-x-auto px-4"
        >
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              type="button"
              onClick={() => setSearchParams(key === 'recipes' ? {} : { tab: key })}
              className={`pressable flex shrink-0 items-center gap-1.5 rounded-pill px-3.5 py-2 text-label font-medium transition-colors duration-200 ${
                tab === key
                  ? 'bg-surface-dark text-ink-on-dark'
                  : 'bg-surface-card text-ink-muted'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div
          className={
            showInventoryGrid
              ? 'mt-4 grid grid-cols-2 gap-x-5 gap-y-3 px-4'
              : 'mt-4 space-y-2.5 px-4'
          }
        >
          {errors[tab] ? (
            <ErrorState message={errors[tab] as string} onRetry={() => void loadTab(tab, { force: true })} />
          ) : null}

          {loadingTab === tab ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : tab === 'recipes' ? (
            recipes.length === 0 ? (
              <EmptyState
                icon={<IconChefHat className="h-9 w-9" />}
                title="No recipes yet"
                body="Scan a recipe card, photograph a handwritten page, or upload a recipe image and Neuton will draft it with costed ingredients."
                action={
                  <Link
                    to="/capture?kind=recipe"
                    className="pressable inline-flex items-center gap-1.5 rounded-pill bg-brand-primary px-4 py-2.5 text-label font-medium text-ink-on-primary"
                  >
                    <IconPlus className="h-4 w-4" />
                    Add a recipe
                  </Link>
                }
              />
            ) : (
              recipes.map((recipe) => (
                <Link
                  key={recipe.id}
                  to={`/catalog/recipes/${recipe.id}`}
                  className="pressable flex flex-col gap-2 rounded-card bg-surface-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-[22px] leading-tight text-ink">
                      {recipe.name}
                    </h2>
                    <span className="shrink-0 rounded-pill bg-brand-teal px-2 py-0.5 text-label font-medium text-ink">
                      {formatMoney(recipe.costing.retailPrice, currency)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-label text-ink-muted">
                      {recipe.prepTimeMinutes} min \u00B7 yields{' '}
                      {formatQuantity(recipe.yieldQuantity, recipe.yieldUnit)}
                    </p>
                    <p className="shrink-0 text-label text-ink-muted">
                      cost {formatMoney(recipe.costing.unitCost, currency)}
                    </p>
                  </div>
                  {recipe.status && (
                    <RecipeStatusPill status={recipe.status} />
                  )}
                </Link>
              ))
            )
          ) : tab === 'inventory' ? (
            inventory.length === 0 ? (
              <EmptyState
                icon={<IconBox className="h-9 w-9" />}
                title="Inventory is empty"
                body="Upload a supplier receipt and Neuton will create stock items and roll their weighted average cost."
                action={
                  <Link
                    to="/capture?kind=receipt"
                    className="pressable inline-flex items-center gap-1.5 rounded-pill bg-brand-primary px-4 py-2.5 text-label font-medium text-ink-on-primary"
                  >
                    <IconPlus className="h-4 w-4" />
                    Upload a receipt
                  </Link>
                }
              />
            ) : (
              inventory.map((item) => (
                <div
                  key={item.id}
                  className="flex aspect-square flex-col gap-2 rounded-card bg-surface-card p-3"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-input bg-surface-canvas">
                    <IconBox className="h-[19px] w-[19px] text-ink-muted-soft" />
                  </div>
                  <div className="h-[18px] shrink-0" aria-hidden="true" />
                  <p className="truncate text-label font-medium text-ink-muted">
                    {item.name}
                  </p>
                  <p className="truncate text-[22px] font-medium leading-[1.3] text-ink">
                    {formatQuantity(item.currentQuantity, item.unit)}
                  </p>
                </div>
              ))
            )
          ) : receipts.length === 0 ? (
            <EmptyState
              icon={<IconReceipt className="h-9 w-9" />}
              title="No receipts yet"
              body="Upload a shopping receipt and Neuton reads the line items, then updates your stock and costs automatically."
              action={
                <Link
                  to="/capture?kind=receipt"
                  className="pressable inline-flex items-center gap-1.5 rounded-pill bg-brand-primary px-4 py-2.5 text-label font-medium text-ink-on-primary"
                >
                  <IconPlus className="h-4 w-4" />
                  Upload a receipt
                </Link>
              }
            />
          ) : (
            receipts.map((receipt) => (
              <ReceiptRow key={receipt.id} receipt={receipt} currency={currency} />
            ))
          )}
        </div>
      </div>

      <Fab {...fabNavigation} />
      <BottomNav />
    </div>
  );
}

/**
 * Every receipt row is a link, whatever its status. A queued, reading or failed
 * receipt is exactly the one a user needs to open: the detail sheet is where the
 * 3s poll watches it finish and where the failure reason is shown in full.
 * Gating the link on `completed` left those states as dead cards, so the sheet
 * could only be reached by typing a deep link.
 */
function ReceiptRow({ receipt, currency }: { receipt: Receipt; currency: string }) {
  return (
    <Link
      to={`/catalog/receipts/${receipt.id}`}
      className="pressable flex flex-col gap-2 rounded-card bg-surface-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 flex-1 font-display text-[22px] leading-tight text-ink">
          {receipt.merchantName ?? receipt.originalFilename ?? 'Unnamed receipt'}
        </h2>
        <ReceiptStatusPill status={receipt.status} />
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-label text-ink-muted">
          {receipt.receiptDate ? formatDate(receipt.receiptDate) : relativeTime(receipt.createdAt)}
        </p>
        <p className="font-display text-[20px] text-ink">
          {receipt.totalAmount
            ? formatMoney(receipt.totalAmount, receipt.currency ?? currency)
            : '\u2014'}
        </p>
      </div>
      {receipt.status === 'failed' && receipt.errorMessage ? (
        <InlineNotice tone="error">{receipt.errorMessage}</InlineNotice>
      ) : null}
    </Link>
  );
}

function ReceiptStatusPill({ status }: { status: Receipt['status'] }) {
  return (
    <span
      className={`shrink-0 rounded-pill px-2 py-0.5 text-label font-medium ${
        RECEIPT_STATUS_PILL_STYLES[status]
      }`}
    >
      {getReceiptStatusLabel(status)}
    </span>
  );
}

function RecipeStatusPill({ status }: { status: Recipe['status'] }) {
  if (!status) return null;
  return (
    <span
      className={`shrink-0 rounded-pill px-2 py-0.5 text-label font-medium ${
        RECEIPT_STATUS_PILL_STYLES[status]
      }`}
    >
      {getReceiptStatusLabel(status)}
    </span>
  );
}
