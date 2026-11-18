import type React from "react";
import { formatMoney } from "@/lib/format";
import { Link } from "react-router-dom";
import type { CatalogPageModel } from "../../CatalogPage.module";
import { RecipeStatusPill } from "../RecipeStatusPill/RecipeStatusPill";
import { CatalogThumbnail } from "../CatalogThumbnail/CatalogThumbnail";
import "../CatalogCard.css";

interface IRecipeCard {
  recipe: CatalogPageModel["recipes"][number];
  currency: string;
  state: CatalogPageModel["recipeNavigationState"];
}

export const RecipeCard: React.FC<IRecipeCard> = ({
  recipe,
  currency,
  state,
}) => {
  const { total, linked, incomplete } = recipe;
  const status = recipe.localUpload ? "uploading" : recipe.status;
  const hasUnitCost =
    !incomplete &&
    recipe.costing.unitCost != null &&
    Number.isFinite(recipe.costing.unitCost);
  return (
    <article className="catalog-card">
      <Link
        to={`/catalog/recipes/${recipe.id}`}
        state={state}
        className="catalog-card__link"
      >
        <CatalogThumbnail imageUrl={recipe.imageUrl} />
        <div className="catalog-card__body">
          <h2 className="catalog-card__title" title={recipe.name}>
            {recipe.name}
          </h2>
          <p className="catalog-card__metadata flex items-center gap-1">
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="7" cy="7" r="5.833" />
              <path d="M7 3.5V7l2.333 1.167" />
            </svg>
            {recipe.prepTimeMinutes} min
          </p>
          <p className="catalog-card__metadata flex flex-wrap items-center gap-x-1.5">
            Unit cost{" "}
            <span className="catalog-card__amount">
              {hasUnitCost
                ? formatMoney(recipe.costing.unitCost, currency)
                : "No price yet"}
            </span>
          </p>
        </div>
      </Link>
      {incomplete ? (
        <div className="px-3 pb-3 text-label text-ink-muted">
          <span className="font-medium">Incomplete</span>
          <p>
            {linked} of {total} ingredients linked — cost incomplete
          </p>
        </div>
      ) : null}
      <RecipeStatusPill status={status} />
    </article>
  );
};
