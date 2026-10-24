import { EmptyState, InlineNotice, Skeleton } from '@/components/feedback';
import { formatMoney, formatQuantity } from '@/lib/format';
import { Link } from 'react-router-dom';
import type { NewOrderPageModel } from '../NewOrderPage.module';
type Props = Pick<
  NewOrderPageModel,
  'itemsError' | 'loading' | 'recipes' | 'currency' | 'quantityOf' | 'changeQuantity'
>;
export function OrderItems({
  itemsError,
  loading,
  recipes,
  currency,
  quantityOf,
  changeQuantity,
}: Props) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-eyebrow font-medium uppercase text-ink-muted">Items</h2>
      {itemsError ? <InlineNotice tone="error">{itemsError}</InlineNotice> : null}

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : recipes.length === 0 ? (
        <EmptyState
          title="No sellable recipes yet"
          body="Add and verify an active recipe before recording orders."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {recipes.map((recipe) => {
            const quantity = quantityOf(recipe.id);
            const incomplete = recipe.costComplete === false;
            return (
              <li
                key={recipe.id}
                className={`flex items-center gap-3 rounded-card border p-3 transition-colors duration-200 ${
                  incomplete
                    ? 'border-hairline bg-surface-cream-strong'
                    : quantity > 0
                      ? 'border-brand-primary bg-surface-card'
                      : 'border-hairline bg-surface-card'
                }`}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p
                    className={`break-words text-body font-medium ${incomplete ? 'text-ink-muted' : 'text-ink'}`}
                  >
                    {recipe.name}
                  </p>
                  <p className="text-label text-ink-muted">
                    {formatQuantity(recipe.yieldQuantity, recipe.yieldUnit)} ·{' '}
                    {incomplete ? 'Costs incomplete' : formatMoney(recipe.retailPrice, currency)}
                  </p>
                  {incomplete ? (
                    <span className="w-fit rounded-pill bg-surface-canvas px-2 py-0.5 text-label font-medium text-ink-muted">
                      Incomplete
                    </span>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {incomplete ? (
                    <Link
                      to={`/catalog/recipes/${recipe.id}/edit`}
                      state={{ recipeReturnTo: '/orders/new' }}
                      className="pressable rounded-pill border border-hairline bg-surface-card px-3 py-2 text-label font-semibold text-brand-primary"
                    >
                      Complete
                    </Link>
                  ) : null}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Remove one ${recipe.name}`}
                      disabled={incomplete || quantity === 0}
                      onClick={() => changeQuantity(recipe, -1)}
                      className="pressable h-8 w-8 rounded-pill border border-hairline text-body text-ink disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="min-w-[2ch] text-center text-body font-medium tabular-nums text-ink">
                      {quantity || '–'}
                    </span>
                    <button
                      type="button"
                      aria-label={`Add one ${recipe.name}`}
                      disabled={incomplete}
                      onClick={() => changeQuantity(recipe, 1)}
                      className="pressable h-8 w-8 rounded-pill border border-hairline text-body text-ink disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
