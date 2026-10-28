import type React from "react";
import { IconPlus } from "@/components/icons";
import type { RecipeEditPageModel } from "../../RecipeEditPage.module";
import { IngredientRow } from "../IngredientRow/IngredientRow";
import { RecipeIdentity } from "../RecipeIdentity/RecipeIdentity";

const addClassName =
  "flex h-10 w-full items-center justify-center gap-2 rounded-input border border-dashed border-ink-muted-soft text-sm font-medium text-brand-primary-active";

interface IIngredientsPanel {
  model: RecipeEditPageModel;
}

export const IngredientsPanel: React.FC<IIngredientsPanel> = ({ model }) => {
  const draft = model.draft;
  if (!draft) return null;
  return (
    <div
      role="tabpanel"
      id="recipe-panel-0"
      aria-labelledby="recipe-tab-0"
      aria-hidden={model.page !== 0}
      className="h-full w-full min-w-0 shrink-0 snap-start overflow-y-auto overscroll-y-contain px-4 pb-5"
    >
      <div className="flex flex-col gap-5">
        <RecipeIdentity model={model} draft={draft} />
        <section
          className="flex flex-col gap-2.5"
          aria-labelledby="edit-ingredients"
        >
          <h2
            id="edit-ingredients"
            className="text-[18px] font-medium leading-6"
          >
            Ingredients
          </h2>
          {draft.ingredients.map((ingredient, index) => (
            <IngredientRow
              key={ingredient.key}
              ingredient={ingredient}
              index={index}
              linked={model.isLinked(ingredient)}
              onChange={model.changeIngredient}
              onRemove={() => model.removeIngredient(ingredient.key)}
              onScan={() => model.openScanner(ingredient.key)}
            />
          ))}
          <button
            type="button"
            onClick={model.addIngredient}
            className={addClassName}
          >
            <IconPlus className="h-4 w-4" />
            Add ingredient
          </button>
        </section>
        <p className="text-label text-ink-muted">
          Recipe costs are recalculated when you save changes.
        </p>
      </div>
    </div>
  );
};
