import type React from "react";
import type { CatalogPageModel } from "../../CatalogPage.module";
import { RecipeCard } from "../RecipeCard/RecipeCard";

interface ICatalogRecipes {
  model: CatalogPageModel;
}

export const CatalogRecipes: React.FC<ICatalogRecipes> = ({ model }) => {
  if (model.errors.recipes) return null;
  return (
    <>
      {model.recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          currency={model.currency}
          state={model.recipeNavigationState}
        />
      ))}
    </>
  );
};
