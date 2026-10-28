import { EmptyState } from '@/components/feedback';
import { IconChefHat } from '@/components/icons';
import type { CatalogPageModel } from '../CatalogPage.module';
import { CatalogCaptureLink, RecipeCard } from '../RecipeCard/RecipeCard';

export function CatalogRecipes({ model }: { model: CatalogPageModel }) {
  if (model.errors.recipes) return null;
  if (model.recipes.length === 0) {
    return (
      <EmptyState
        icon={<IconChefHat className="h-9 w-9" />}
        title="No recipes yet"
        body="Scan a recipe card, photograph a handwritten page, or upload a recipe image and Neuton will draft it with costed ingredients."
        action={<CatalogCaptureLink to="/capture?kind=recipe" label="Add a recipe" />}
      />
    );
  }
  return (
    <>
      {model.recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} currency={model.currency} state={model.recipeNavigationState} />
      ))}
    </>
  );
}
