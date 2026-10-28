import type React from "react";
import { DocumentSources } from "@/components/DocumentSources/DocumentSources";
import { Sheet, SheetSection } from "@/components/Sheet/Sheet";
import { ErrorState } from "@/components/feedback";
import { IconBox } from "@/components/icons";
import { RecipeDetailActions } from "./components/RecipeDetailActions/RecipeDetailActions";
import { RecipeDetailHero } from "./components/RecipeDetailHero/RecipeDetailHero";
import {
  useRecipeDetailPage,
  type RecipeDetailPageModel,
} from "./RecipeDetailPage.module";
import { RecipeDetailSkeleton } from "./components/RecipeDetailSkeleton/RecipeDetailSkeleton";
import { RecipeIngredientsSection } from "./components/RecipeIngredientsSection/RecipeIngredientsSection";
import {
  RecipeAllergens,
  RecipeSteps,
  RecipeYield,
} from "./components/RecipeMeta/RecipeMeta";

export const RecipeDetailPage: React.FC = () => {
  return <RecipeDetailView model={useRecipeDetailPage()} />;
};

interface IRecipeDetailView {
  model: RecipeDetailPageModel;
}

export const RecipeDetailView: React.FC<IRecipeDetailView> = ({ model }) => {
  const {
    recipe,
    loading,
    error,
    currency,
    incomplete,
    total,
    linked,
    showCostWarning,
  } = model;
  return (
    <Sheet open fillHeight onClose={model.close} label="Recipe details">
      <div
        className={`flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-5 pt-1.5 [&>div]:shrink-0 [&>section]:shrink-0 ${showCostWarning ? "pb-16" : "pb-5"}`}
      >
        {error ? (
          <ErrorState
            message={error}
            onRetry={() => void model.handleRetry()}
          />
        ) : null}
        {loading && !recipe ? (
          <RecipeDetailSkeleton />
        ) : recipe ? (
          <>
            <RecipeDetailHero
              recipe={recipe}
              currency={currency}
              incomplete={incomplete}
            />
            <RecipeIngredientsSection
              recipe={recipe}
              currency={currency}
              incomplete={incomplete}
              total={total}
              linked={linked}
              canVerify={model.canVerify}
              onLink={model.edit}
            />
            {recipe.allergens && recipe.allergens.length > 0 ? (
              <RecipeAllergens allergens={recipe.allergens} />
            ) : null}
            <RecipeYield recipe={recipe} />
            <RecipeSteps steps={model.steps} />
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
      <RecipeDetailActions model={model} />
    </Sheet>
  );
};
