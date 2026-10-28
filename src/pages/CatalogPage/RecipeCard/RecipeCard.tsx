import { IconPlus } from '@/components/icons';
import { formatMoney, formatQuantity } from '@/lib/format';
import { Link } from 'react-router-dom';
import type { CatalogPageModel } from '../CatalogPage.module';
import { RecipeStatusPill } from '../RecipeStatusPill/RecipeStatusPill';

type Recipe = CatalogPageModel['recipes'][number];

export function RecipeCard({
  recipe,
  currency,
  state,
}: {
  recipe: Recipe;
  currency: string;
  state: CatalogPageModel['recipeNavigationState'];
}) {
  const { total, linked, incomplete } = recipe;
  return (
    <Link
      to={`/catalog/recipes/${recipe.id}`}
      state={state}
      className="pressable flex flex-col gap-2 rounded-card bg-surface-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-[22px] leading-tight text-ink">{recipe.name}</h2>
        <span className="shrink-0 rounded-pill bg-brand-teal px-2 py-0.5 text-label font-medium text-ink">
          {incomplete ? 'No price yet' : formatMoney(recipe.costing.retailPrice, currency)}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-label text-ink-muted">
          {recipe.prepTimeMinutes} min · yields {formatQuantity(recipe.yieldQuantity, recipe.yieldUnit)}
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
      <div className="flex flex-wrap items-center gap-2">
        {recipe.status && <RecipeStatusPill status={recipe.status} />}
        {incomplete ? (
          <span className="rounded-pill bg-surface-cream-strong px-2 py-0.5 text-label font-medium text-ink-muted">
            Incomplete
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export function CatalogCaptureLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="pressable inline-flex items-center gap-1.5 rounded-pill bg-brand-primary px-4 py-2.5 text-label font-medium text-ink-on-primary"
    >
      <IconPlus className="h-4 w-4" />
      {label}
    </Link>
  );
}
