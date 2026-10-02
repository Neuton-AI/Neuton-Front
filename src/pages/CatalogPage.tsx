import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { Fab, useFabNavigation } from '../components/Fab';
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

export function CatalogPage() {
  const { user, token } = useAuth();
  const { memberships, activeShopId } = useShopMemberships(user?.id);
  const shop = useCurrentShop(memberships, activeShopId);
  const fabNavigation = useFabNavigation();

  // The tab lives in the URL so Capture can deep-link back to receipts.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const tab: Tab = TABS.some((t) => t.key === requestedTab)
    ? (requestedTab as Tab)
    : 'recipes';

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
            const data = await apiFetch<{ recipes: Recipe[] }>('/recipes', {
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

  useEffect(() => {
    void loadTab(tab);
  }, [tab, loadTab]);

  const currency = shop?.currency ?? 'USD';

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

        <div className="mt-4 space-y-2.5 px-4">
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
                body="Scan a recipe card or photograph a handwritten page and Neuton will draft it with costed ingredients."
                action={
                  <Link
                    to="/capture?source=camera&kind=recipe"
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
                      {recipe.prepTimeMinutes} min · yields{' '}
                      {formatQuantity(recipe.yieldQuantity, recipe.yieldUnit)}
                    </p>
                    <p className="shrink-0 text-label text-ink-muted">
                      cost {formatMoney(recipe.costing.unitCost, currency)}
                    </p>
                  </div>
                </Link>
              ))
            )
          ) : tab === 'inventory' ? (
            inventory.length === 0 ? (
              <EmptyState
                icon={<IconBox className="h-9 w-9" />}
                title="Inventory is empty"
                body="Upload a supplier receipt and Neuton will create stock items and roll their weighted average cost."
              />
            ) : (
              inventory.map((item) => (
                <div key={item.id} className="flex flex-col gap-2 rounded-card bg-surface-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 flex-1 font-display text-[22px] leading-tight text-ink">
                      {item.name}
                    </h2>
                    {item.isLowStock ? (
                      <span className="shrink-0 rounded-pill bg-semantic-warning/15 px-2 py-0.5 text-label font-medium text-ink">
                        Low
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-label text-ink-muted">
                      {formatQuantity(item.currentQuantity, item.unit)} on hand
                    </p>
                    <p className="font-display text-[20px] text-ink">
                      {formatMoney(item.averageUnitCost, currency)}
                      <span className="ml-1 font-sans text-label text-ink-muted">
                        avg / {item.unit}
                      </span>
                    </p>
                  </div>
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
                  to="/capture?source=file&kind=receipt"
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

function ReceiptRow({ receipt, currency }: { receipt: Receipt; currency: string }) {
  const body = (
    <div className="flex flex-col gap-2 rounded-card bg-surface-card p-4">
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
            : '—'}
        </p>
      </div>
      {receipt.status === 'failed' && receipt.errorMessage ? (
        <InlineNotice tone="error">{receipt.errorMessage}</InlineNotice>
      ) : null}
    </div>
  );

  return receipt.status === 'completed' ? (
    <Link to={`/catalog/receipts/${receipt.id}`} className="pressable block">
      {body}
    </Link>
  ) : (
    <div>{body}</div>
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