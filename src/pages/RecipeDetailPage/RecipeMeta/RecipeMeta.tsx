import { SheetBadge, SheetSection } from '@/components/Sheet/Sheet';
import { formatQuantity } from '@/lib/format';
import type { RecipeDetailPageModel } from '../RecipeDetailPage.module';

type Recipe = NonNullable<RecipeDetailPageModel['recipe']>;

export function RecipeAllergens({ allergens }: { allergens: string[] }) {
  return (
    <SheetSection title="Allergens">
      <div className="flex flex-wrap gap-2">
        {allergens.map((allergen) => (
          <SheetBadge key={allergen}>{allergen}</SheetBadge>
        ))}
      </div>
    </SheetSection>
  );
}

export function RecipeYield({ recipe }: { recipe: Recipe }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-card bg-surface-card px-3.5 py-3">
      <div className="flex min-w-0 flex-col">
        <p className="text-eyebrow font-medium uppercase text-ink-muted">Batch yield check</p>
        <p className="font-display text-card-value text-ink">
          {formatQuantity(recipe.yieldQuantity, recipe.yieldUnit)}
        </p>
      </div>
      <SheetBadge tone={recipe.costing.inStock ? 'success' : 'danger'}>
        {recipe.costing.inStock ? 'In stock' : 'Short'}
      </SheetBadge>
    </div>
  );
}

export function RecipeSteps({ steps }: { steps: string[] }) {
  return (
    <SheetSection title="Preparation">
      {steps.length === 0 ? (
        <p className="text-[14px] leading-[155%] text-ink-muted">No preparation steps recorded.</p>
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
  );
}
