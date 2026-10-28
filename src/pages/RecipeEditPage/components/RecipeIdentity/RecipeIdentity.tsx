import type React from "react";
import { IconCamera } from "@/components/icons";
import { Button, Field, Input } from "@/components/ui";
import type { RecipeEditPageModel } from "../../RecipeEditPage.module";

type Draft = NonNullable<RecipeEditPageModel["draft"]>;

interface IRecipeIdentity {
  model: RecipeEditPageModel;
  draft: Draft;
}

export const RecipeIdentity: React.FC<IRecipeIdentity> = ({ model, draft }) => {
  return (
    <>
      <div className="flex items-center gap-3.5">
        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-card bg-surface-cream-strong">
          {draft.imageUrl ? (
            <img
              src={draft.imageUrl}
              alt="Recipe"
              className="h-full w-full object-cover"
            />
          ) : (
            <IconCamera className="h-7 w-7 text-ink-muted-soft" />
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <Button
            variant="outline"
            size="sm"
            radius="input"
            onClick={() => model.setEditingPhoto(!model.editingPhoto)}
          >
            <IconCamera className="h-4 w-4" />
            Change photo
          </Button>
          <button
            type="button"
            onClick={() => model.changeField("imageUrl", "")}
            className="pl-0.5 text-label font-medium text-ink-muted"
          >
            Remove photo
          </button>
        </div>
      </div>
      {model.editingPhoto ? (
        <Field label="Photo URL" htmlFor="recipe-image">
          <Input
            id="recipe-image"
            type="url"
            value={draft.imageUrl}
            onChange={(event) =>
              model.changeField("imageUrl", event.target.value)
            }
            placeholder="https://…"
          />
        </Field>
      ) : null}
      <Field label="RECIPE NAME" htmlFor="recipe-name">
        <Input
          id="recipe-name"
          required
          maxLength={160}
          value={draft.name}
          onChange={(event) => model.changeField("name", event.target.value)}
        />
      </Field>
      <div className="flex gap-3">
        <Field
          label="PREP TIME · MIN"
          htmlFor="recipe-prep"
          className="min-w-0 flex-1"
        >
          <Input
            id="recipe-prep"
            type="number"
            min={0}
            max={10000}
            step={1}
            value={draft.prepTimeMinutes}
            onChange={(event) =>
              model.changeField("prepTimeMinutes", event.target.value)
            }
          />
        </Field>
        <Field label="SERVES" htmlFor="recipe-yield" className="min-w-0 flex-1">
          <Input
            id="recipe-yield"
            type="number"
            min={0}
            max={100000}
            step="any"
            value={draft.yieldQuantity}
            onChange={(event) =>
              model.changeField("yieldQuantity", event.target.value)
            }
          />
        </Field>
      </div>
    </>
  );
};
