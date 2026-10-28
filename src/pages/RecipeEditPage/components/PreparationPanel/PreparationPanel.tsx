import type React from "react";
import { IconClose, IconPlus } from "@/components/icons";
import { Textarea } from "@/components/ui";
import { AllergenPicker } from "../AllergenPicker/AllergenPicker";
import type { RecipeEditPageModel } from "../../RecipeEditPage.module";

const addClassName =
  "flex h-10 w-full items-center justify-center gap-2 rounded-input border border-dashed border-ink-muted-soft text-sm font-medium text-brand-primary-active";

interface IPreparationPanel {
  model: RecipeEditPageModel;
}

export const PreparationPanel: React.FC<IPreparationPanel> = ({ model }) => {
  const draft = model.draft;
  const recipe = model.recipe;
  if (!draft || !recipe) return null;
  return (
    <div
      role="tabpanel"
      id="recipe-panel-1"
      aria-labelledby="recipe-tab-1"
      aria-hidden={model.page !== 1}
      className="h-full w-full min-w-0 shrink-0 snap-start overflow-y-auto overscroll-y-contain px-4 pb-5"
    >
      <div className="flex flex-col gap-5">
        <AllergenPicker
          key={`${recipe.id}:${model.allergenResetKey}`}
          selected={draft.allergens}
          onToggle={model.toggleAllergen}
        />
        <section
          className="flex flex-col gap-2.5"
          aria-labelledby="edit-preparation"
        >
          <h2 id="edit-preparation" className="text-[18px] font-medium">
            Preparation
          </h2>
          {draft.steps.map((instruction, index) => (
            <div key={index} className="flex items-start gap-2.5">
              <span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-brand-primary text-label text-ink-on-primary">
                {index + 1}
              </span>
              <Textarea
                aria-label={`Preparation step ${index + 1}`}
                rows={2}
                maxLength={20000}
                value={instruction}
                onChange={(event) =>
                  model.changeStep(index, event.target.value)
                }
                className="min-w-0 flex-1 text-sm"
              />
              <button
                type="button"
                aria-label={`Remove step ${index + 1}`}
                onClick={() =>
                  model.changeField(
                    "steps",
                    draft.steps.filter((_, i) => i !== index),
                  )
                }
                className="flex h-11 w-5 shrink-0 items-center justify-center text-ink-muted"
              >
                <IconClose className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => model.changeField("steps", [...draft.steps, ""])}
            className={addClassName}
          >
            <IconPlus className="h-4 w-4" />
            Add step
          </button>
        </section>
      </div>
    </div>
  );
};
