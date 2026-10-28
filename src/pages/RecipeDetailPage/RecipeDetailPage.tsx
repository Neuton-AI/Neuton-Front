import { Sheet, SheetBadge, SheetSection } from '@/components/Sheet/Sheet';
import { DocumentSources } from '@/components/DocumentSources/DocumentSources';
import { VerificationStatus, VerificationStatusIcon } from '@/components/VerificationStatus';
import { ErrorState, InlineNotice, Skeleton } from '@/components/feedback';
import { IconBox, IconEdit, IconTrash } from '@/components/icons';
import {
  getReceiptStatusLabel,
  RECEIPT_STATUS_PILL_STYLES,
} from '@/features/receipts/receiptStatus';
import { formatMoney, formatQuantity } from '@/lib/format';
import { RecipeIngredients } from './RecipeIngredients';
import { useRecipeDetailPage, type RecipeDetailPageModel } from './RecipeDetailPage.module';

const actionClassName =
  'inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-card text-body font-semibold';

export function RecipeDetailPage() {
  return <RecipeDetailView model={useRecipeDetailPage()} />;
}

export function RecipeDetailView({ model }: { model: RecipeDetailPageModel }) {
  const {
    recipe,
    verifyError,
    deleteError,
    loading,
    error,
    currency,
    close,
    canVerify,
    verify,
    steps,
    remove,
    total,
    linked,
    incomplete,
    showCostWarning,
    costWarningExiting,
    handleRetry,
    verifyPending,
    deletePending,
    edit,
  } = model;
  const isUnverified = recipe?.status === 'unverified';
  const isReviewedState = isUnverified || recipe?.status === 'verified';
  const showActions = recipe && canVerify;

  return (
    <Sheet open fillHeight onClose={close} label="Recipe details">
      <div
        className={`flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-5 pt-1.5 [&>div]:shrink-0 [&>section]:shrink-0 ${showCostWarning ? 'pb-16' : 'pb-5'}`}
      >
        {error ? <ErrorState message={error} onRetry={() => void handleRetry()} /> : null}
        {loading && !recipe ? (
          <>
            <Skeleton className="h-[72px]" />
            <Skeleton className="h-14" />
            <Skeleton className="h-40" />
            <Skeleton className="h-24" />
          </>
        ) : recipe ? (
          <>
            <div className="flex h-[72px] items-center justify-center overflow-hidden rounded-card bg-surface-card">
              {recipe.imageUrl ? (
                <img
                  src={recipe.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <svg
                  className="h-[43.2px] w-[43.2px] text-ink-muted-soft"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <h1 className="break-words font-display text-card-value text-ink">{recipe.name}</h1>
              <p className="text-[14px] leading-[155%] text-ink-muted">
                {recipe.prepTimeMinutes} min prep · Serves {formatQuantity(recipe.yieldQuantity)} ·
                Unit cost{' '}
                {recipe.costing.unitCost == null
                  ? 'Incomplete'
                  : `${formatMoney(recipe.costing.unitCost, currency)}${incomplete ? ' (partial)' : ''}`}
              </p>
            </div>
            {recipe.status === 'pending' || recipe.status === 'processing' ? (
              <InlineNotice>Extraction in progress — check back in a moment.</InlineNotice>
            ) : recipe.status === 'failed' ? (
              <InlineNotice tone="error">
                Extraction failed. Please try uploading again.
              </InlineNotice>
            ) : null}
            {isUnverified ? (
              <p id="recipe-review-description" className="sr-only">
                Extracted, not reviewed. Verify it to publish the recipe for orders.
              </p>
            ) : null}
            <section aria-labelledby="recipe-ingredients" className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3 pb-0.5">
                <h2
                  id="recipe-ingredients"
                  className="text-[18px] font-medium leading-[25px] text-ink"
                >
                  Ingredients
                </h2>
                {isReviewedState ? (
                  <VerificationStatus verified={!isUnverified} />
                ) : recipe.status ? (
                  <span
                    className={`rounded-pill px-2 py-0.5 text-label font-medium ${RECEIPT_STATUS_PILL_STYLES[recipe.status]}`}
                  >
                    {getReceiptStatusLabel(recipe.status)}
                  </span>
                ) : null}
              </div>
              {incomplete ? (
                <p className="pb-0.5 text-label font-medium text-brand-primary-active">
                  {total - linked} of {total} not linked · cost is incomplete
                </p>
              ) : null}
              <RecipeIngredients
                ingredients={recipe.costing.ingredients}
                showLinkStatus={linked < total}
                onLink={edit}
                canManage={canVerify}
              />
              {recipe.costing.ingredients.length > 0 ? (
                <p className="text-label font-medium text-ink-muted">
                  Ingredients {formatMoney(recipe.costing.ingredientsCost, currency)}
                  {incomplete ? ' (partial)' : ''} · Labor{' '}
                  {formatMoney(recipe.costing.laborCost, currency)}
                </p>
              ) : null}
            </section>
            {recipe.allergens && recipe.allergens.length > 0 ? (
              <SheetSection title="Allergens">
                <div className="flex flex-wrap gap-2">
                  {recipe.allergens.map((allergen) => (
                    <SheetBadge key={allergen}>{allergen}</SheetBadge>
                  ))}
                </div>
              </SheetSection>
            ) : null}
            <div className="flex items-center justify-between gap-2 rounded-card bg-surface-card px-3.5 py-3">
              <div className="flex min-w-0 flex-col">
                <p className="text-eyebrow font-medium uppercase text-ink-muted">
                  Batch yield check
                </p>
                <p className="font-display text-card-value text-ink">
                  {formatQuantity(recipe.yieldQuantity, recipe.yieldUnit)}
                </p>
              </div>
              <SheetBadge tone={recipe.costing.inStock ? 'success' : 'danger'}>
                {recipe.costing.inStock ? 'In stock' : 'Short'}
              </SheetBadge>
            </div>
            <SheetSection title="Preparation">
              {steps.length === 0 ? (
                <p className="text-[14px] leading-[155%] text-ink-muted">
                  No preparation steps recorded.
                </p>
              ) : (
                <ol className="flex flex-col gap-1.5">
                  {steps.map((step, index) => (
                    <li key={`${index}-${step.slice(0, 12)}`} className="flex gap-2.5 py-1">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-brand-primary text-label font-medium text-ink-on-primary">
                        {index + 1}
                      </span>
                      <span className="min-w-0 whitespace-pre-wrap break-words text-[14px] leading-[155%] text-ink-body">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </SheetSection>
            {recipe.sources?.length ? (
              <SheetSection title="Original scans">
                <DocumentSources
                  token={model.token}
                  shopId={model.activeShopId}
                  sources={recipe.sources}
                />
              </SheetSection>
            ) : null}
          </>
        ) : !error ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <IconBox className="h-8 w-8 text-ink-muted-soft" />
            <p className="text-body text-ink-muted">Recipe not found.</p>
          </div>
        ) : null}
      </div>
      {showActions ? (
        <div className="relative flex shrink-0 flex-col gap-3 border-t border-hairline px-5 pt-3">
          {verifyError ? <InlineNotice tone="error">{verifyError}</InlineNotice> : null}
          {deleteError ? <InlineNotice tone="error">{deleteError}</InlineNotice> : null}
          <div className="relative flex items-center gap-3">
            {showCostWarning ? (
              <div
                id="recipe-cost-warning"
                role="note"
                data-exiting={costWarningExiting}
                className="recipe-cost-warning pointer-events-none absolute bottom-[calc(100%+0px)] right-0 flex w-[calc(50%-6px)] flex-col items-end"
              >
                <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-input bg-[#A63B3B] py-2 pl-2.5 pr-3 text-label font-semibold text-white">
                  <VerificationStatusIcon verified={false} className="h-4 w-4 shrink-0" />
                  Danger: Incomplete cost
                </span>
                <svg
                  className="h-1.5 w-3 self-center text-[#A63B3B]"
                  viewBox="0 0 12 6"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M0 0H12L6 6Z" />
                </svg>
              </div>
            ) : null}

            {isReviewedState ? (
              <button
                type="button"
                onClick={() => edit()}
                className={`${actionClassName} border border-hairline bg-surface-canvas text-ink`}
              >
                <IconEdit className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                Edit Recipe
              </button>
            ) : null}
            {isUnverified ? (
              <button
                type="button"
                disabled={verifyPending || deletePending}
                aria-busy={verifyPending}
                aria-describedby={`recipe-review-description${showCostWarning ? ' recipe-cost-warning' : ''}`}
                onClick={() => void verify()}
                className={`${actionClassName} pressable bg-brand-teal text-ink disabled:cursor-not-allowed disabled:opacity-45`}
              >
                <VerificationStatusIcon verified className="h-[18px] w-[18px] shrink-0" />
                {verifyPending ? 'Verifying…' : 'Verify Recipe'}
              </button>
            ) : (
              <button
                type="button"
                disabled={deletePending}
                aria-busy={deletePending}
                onClick={() => void remove()}
                className={`${actionClassName} pressable bg-[#F6DEDA] text-[#A63B3B] disabled:cursor-not-allowed disabled:opacity-45`}
              >
                <IconTrash className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                {deletePending ? 'Deleting…' : 'Delete Recipe'}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
