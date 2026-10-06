import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sheet, SheetBadge, SheetSection, useSheetClose } from '../components/Sheet';
import { ErrorState, Skeleton } from '../components/feedback';
import { IconBox, IconChefHat } from '../components/icons';
import { apiFetch, type Recipe } from '../lib/api';
import { formatMoney, formatQuantity } from '../lib/format';
import { useAuth, useCurrentShop, useShopMemberships } from '../lib/supabase';

/** Renders the OpenPencil "Modal / Recipe Detail" sheet from GET /recipes/:id. */
export function RecipeDetailPage() {
  const { id = '' } = useParams();
  const { user, token } = useAuth();
  const { memberships, activeShopId } = useShopMemberships(user?.id);
  const shop = useCurrentShop(memberships, activeShopId);

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const currency = shop?.currency ?? 'USD';
  const close = useSheetClose('/catalog');
  const loadKey = `${token ?? ''}:${activeShopId ?? ''}:${reloadKey}`;

  useEffect(() => {
    if (!token || !activeShopId || !id) return;
    const controller = new AbortController();

    setLoading(true);
    setError(null);
    apiFetch<{ recipe: Recipe }>(`/recipes/${id}`, {
      token,
      shopId: activeShopId,
      signal: controller.signal,
    })
      .then((data) => setRecipe(data.recipe))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Could not load the recipe.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [loadKey, id]);

  const steps = (recipe?.instructions ?? '')
    .split(/\r?\n+|(?:\d+[.)]\s+)/)
    .map((step) => step.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);

  return (
    <Sheet open onClose={close} label="Recipe details">
      <div className="flex flex-col gap-3 overflow-y-auto px-5 pb-5 pt-2">
        {error ? (
          <ErrorState message={error} onRetry={() => setReloadKey((n) => n + 1)} />
        ) : null}

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
                <IconChefHat className="h-11 w-11 text-ink-muted-soft" />
              )}
            </div>

            <div className="flex flex-col gap-0.5">
              <h1 className="font-display text-card-value text-ink">{recipe.name}</h1>
              <p className="text-body text-ink-muted">
                {recipe.prepTimeMinutes} min prep · Serves{' '}
                {formatQuantity(recipe.yieldQuantity, recipe.yieldUnit)} · Unit cost{' '}
                {formatMoney(recipe.costing.unitCost, currency)}
              </p>
            </div>

            <SheetSection title="Ingredients">
              {recipe.costing.ingredients.length === 0 ? (
                <p className="text-body text-ink-muted">No ingredients linked yet.</p>
              ) : (
                <>
                  <ul className="flex flex-col">
                    {recipe.costing.ingredients.map((ingredient) => (
                      <li
                        key={ingredient.name}
                        className="flex items-center justify-between gap-2 py-1.5"
                      >
                        <span className="truncate text-body text-ink">{ingredient.name}</span>
                        <span className="shrink-0 text-body text-ink-muted">
                          {formatQuantity(ingredient.quantity, ingredient.unit)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-label font-medium text-ink-muted">
                    Ingredients {formatMoney(recipe.costing.ingredientsCost, currency)} · Labor{' '}
                    {formatMoney(recipe.costing.laborCost, currency)}
                  </p>
                </>
              )}
            </SheetSection>

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
              <div className="flex flex-col">
                <p className="text-eyebrow font-medium uppercase text-ink-muted">Batch yield check</p>
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
                <p className="text-body text-ink-muted">No preparation steps recorded.</p>
              ) : (
                <ol className="flex flex-col gap-1">
                  {steps.map((step, index) => (
                    <li key={`${index}-${step.slice(0, 12)}`} className="flex gap-2.5 py-1">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-brand-primary text-label font-medium text-ink-on-primary">
                        {index + 1}
                      </span>
                      <span className="text-body text-ink-body">{step}</span>
                    </li>
                  ))}
                </ol>
              )}
            </SheetSection>
          </>
        ) : !error ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <IconBox className="h-8 w-8 text-ink-muted-soft" />
            <p className="text-body text-ink-muted">Recipe not found.</p>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}