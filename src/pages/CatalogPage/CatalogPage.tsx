import { BottomNav } from '@/components/BottomNav/BottomNav';
import { Fab } from '@/components/Fab/Fab';
import { EmptyState, ErrorState } from '@/components/feedback';
import { IconBox, IconChefHat, IconPlus, IconReceipt } from '@/components/icons';
import { Layout } from '@/components/Layout/Layout';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { formatMoney, formatQuantity } from '@/lib/format';
import { Link } from 'react-router-dom';
import { useCatalogPage } from './CatalogPage.module';
import { ReceiptRow } from './ReceiptRow/ReceiptRow';
import { RecipeStatusPill } from './RecipeStatusPill/RecipeStatusPill';
type Tab = 'recipes' | 'receipts' | 'inventory';

const TABS: { key: Tab; label: string }[] = [
  { key: 'recipes', label: 'Recipes' },
  { key: 'receipts', label: 'Receipts' },
  { key: 'inventory', label: 'Inventory' },
];
export function CatalogPage() {
  const {
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
  } = useCatalogPage();
  return (
    <Layout
      className="shell"
      mainContent={
        <div className="flex-1 pb-32 pt-[max(var(--safe-top)+44px,44px)]">
          <div className="px-4">
            <PageHeader eyebrow={shop?.name} title="Catalog" />
          </div>

          <div className="no-scrollbar mt-4 overflow-x-auto px-4">
            <div
              role="tablist"
              aria-label="Catalog section"
              className="flex gap-1 rounded-card border border-hairline bg-surface-soft p-1"
            >
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  type="button"
                  onClick={() => handleSelectTab(key)}
                  className={`pressable flex shrink-0 items-center rounded-input px-3.5 py-2 text-label font-medium transition-colors duration-200 ${
                    tab === key ? 'bg-surface-card text-ink' : 'text-ink-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div
            className={
              showInventoryGrid
                ? 'mt-4 grid grid-cols-2 gap-x-5 gap-y-3 px-4'
                : 'mt-4 space-y-2.5 px-4'
            }
          >
            {errors[tab] ? (
              <ErrorState message={errors[tab] as string} onRetry={() => refetchTab(tab)} />
            ) : null}

            {loadingTab === tab ? (
              tab === 'recipes' ? (
                <div className="flex flex-col gap-3" aria-hidden="true">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="pressable flex flex-col gap-2 rounded-card bg-surface-card p-4 animate-pulse"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="h-14 w-[200px] max-w-[50%] rounded-card bg-surface-canvas" />
                        <div className="h-6 w-20 shrink-0 rounded-pill bg-surface-canvas" />
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="h-3 w-[120px] max-w-[40%] rounded-[6px] bg-surface-canvas" />
                        <div className="h-3 w-[80px] max-w-[30%] rounded-[6px] bg-surface-canvas" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : tab === 'receipts' ? (
                <div className="flex flex-col gap-3" aria-hidden="true">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="pressable flex flex-col gap-2 rounded-card bg-surface-card p-4 animate-pulse"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="h-6 w-[180px] max-w-[50%] rounded-card bg-surface-canvas" />
                        <div className="h-5 w-16 shrink-0 rounded-pill bg-surface-canvas" />
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="h-3 w-[100px] max-w-[40%] rounded-[6px] bg-surface-canvas" />
                        <div className="h-[18px] w-14 shrink-0 rounded-[6px] bg-surface-canvas" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-5 gap-y-3" aria-hidden="true">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="flex aspect-square flex-col gap-2 rounded-card bg-surface-card p-3 animate-pulse"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-input bg-surface-canvas" />
                      <div className="h-[18px] shrink-0" />
                      <div className="h-3 w-[80px] max-w-full rounded-[6px] bg-surface-canvas" />
                      <div className="h-7 w-[60px] max-w-full rounded-[6px] bg-surface-canvas" />
                    </div>
                  ))}
                </div>
              )
            ) : tab === 'recipes' ? (
              errors.recipes ? null : recipes.length === 0 ? (
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
                recipes.map((recipe) => {
                  const { total, linked, incomplete } = recipe;
                  return (
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
                          {incomplete
                            ? 'No price yet'
                            : formatMoney(recipe.costing.retailPrice, currency)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-label text-ink-muted">
                          {recipe.prepTimeMinutes} min · yields{' '}
                          {formatQuantity(recipe.yieldQuantity, recipe.yieldUnit)}
                        </p>
                        <p className="shrink-0 text-label text-ink-muted">
                          cost {incomplete ? 'incomplete' : formatMoney(recipe.costing.unitCost, currency)}
                        </p>
                      </div>
                      {incomplete ? (
                        <p className="text-label font-medium text-ink-muted">
                          {linked} of {total} ingredients linked — cost incomplete
                        </p>
                      ) : null}
                      {recipe.status && <RecipeStatusPill status={recipe.status} />}
                    </Link>
                  );
                })
              )
            ) : tab === 'inventory' ? (
              errors.inventory ? null : inventory.length === 0 ? (
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
                    <p className="truncate text-label font-medium text-ink-muted">{item.name}</p>
                    <p className="truncate text-[22px] font-medium leading-[1.3] text-ink">
                      {formatQuantity(item.currentQuantity, item.unit)}
                    </p>
                  </div>
                ))
              )
            ) : errors.receipts ? null : receipts.length === 0 ? (
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
      }
      actions={<Fab {...fabNavigation} />}
      footer={<BottomNav />}
    />
  );
}
