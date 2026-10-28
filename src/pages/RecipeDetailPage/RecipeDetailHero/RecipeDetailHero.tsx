import { InlineNotice } from '@/components/feedback';
import { formatMoney, formatQuantity } from '@/lib/format';
import type { RecipeDetailPageModel } from '../RecipeDetailPage.module';
import { RecipeImagePlaceholder } from '../RecipeDetailSkeleton/RecipeDetailSkeleton';

type Recipe = NonNullable<RecipeDetailPageModel['recipe']>;

export function RecipeDetailHero({
  recipe,
  currency,
  incomplete,
}: {
  recipe: Recipe;
  currency: string;
  incomplete: boolean;
}) {
  const unitCost =
    recipe.costing.unitCost == null
      ? 'Incomplete'
      : `${formatMoney(recipe.costing.unitCost, currency)}${incomplete ? ' (partial)' : ''}`;
  return (
    <>
      <div className="flex h-[72px] items-center justify-center overflow-hidden rounded-card bg-surface-card">
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <RecipeImagePlaceholder />
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <h1 className="break-words font-display text-card-value text-ink">{recipe.name}</h1>
        <p className="text-[14px] leading-[155%] text-ink-muted">
          {recipe.prepTimeMinutes} min prep · Serves {formatQuantity(recipe.yieldQuantity)} · Unit cost {unitCost}
        </p>
      </div>
      {recipe.status === 'pending' || recipe.status === 'processing' ? (
        <InlineNotice>Extraction in progress — check back in a moment.</InlineNotice>
      ) : recipe.status === 'failed' ? (
        <InlineNotice tone="error">Extraction failed. Please try uploading again.</InlineNotice>
      ) : null}
      {recipe.status === 'unverified' ? (
        <p id="recipe-review-description" className="sr-only">
          Extracted, not reviewed. Verify it to publish the recipe for orders.
        </p>
      ) : null}
    </>
  );
}
