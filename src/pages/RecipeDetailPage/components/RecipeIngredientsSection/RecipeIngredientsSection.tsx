import type React from "react";
import { VerificationStatus } from "@/components/VerificationStatus/VerificationStatus";
import {
  getReceiptStatusLabel,
  RECEIPT_STATUS_PILL_STYLES,
} from "@/features/receipts/receiptStatus";
import { formatMoney } from "@/lib/format";
import type { RecipeDetailPageModel } from "../../RecipeDetailPage.module";
import { RecipeIngredients } from "../RecipeIngredients/RecipeIngredients";

type Recipe = NonNullable<RecipeDetailPageModel["recipe"]>;

interface IRecipeIngredientsSection {
  recipe: Recipe;
  currency: string;
  incomplete: boolean;
  total: number;
  linked: number;
  canVerify: boolean;
  onLink: RecipeDetailPageModel["edit"];
}

export const RecipeIngredientsSection: React.FC<IRecipeIngredientsSection> = ({
  recipe,
  currency,
  incomplete,
  total,
  linked,
  canVerify,
  onLink,
}) => {
  const isUnverified = recipe.status === "unverified";
  const isReviewedState = isUnverified || recipe.status === "verified";
  return (
    <section
      aria-labelledby="recipe-ingredients"
      className="flex flex-col gap-1.5"
    >
      <div className="flex items-center justify-between gap-3 pb-0.5">
        <h2
          id="recipe-ingredients"
          className="text-[18px] font-medium leading-[25px] text-ink"
        >
          Ingredients
        </h2>
        {isReviewedState ? (
          <VerificationStatus verified={!isUnverified} />
        ) : recipe.status ? (
          <span
            className={`rounded-pill px-2 py-0.5 text-label font-medium ${RECEIPT_STATUS_PILL_STYLES[recipe.status]}`}
          >
            {getReceiptStatusLabel(recipe.status)}
          </span>
        ) : null}
      </div>
      {incomplete ? (
        <p className="pb-0.5 text-label font-medium text-brand-primary-active">
          {total - linked} of {total} not linked · cost is incomplete
        </p>
      ) : null}
      <RecipeIngredients
        ingredients={recipe.costing.ingredients}
        showLinkStatus={linked < total}
        onLink={onLink}
        canManage={canVerify}
      />
      {recipe.costing.ingredients.length > 0 ? (
        <p className="text-label font-medium text-ink-muted">
          Ingredients {formatMoney(recipe.costing.ingredientsCost, currency)}
          {incomplete ? " (partial)" : ""} · Labor{" "}
          {formatMoney(recipe.costing.laborCost, currency)}
        </p>
      ) : null}
    </section>
  );
};
