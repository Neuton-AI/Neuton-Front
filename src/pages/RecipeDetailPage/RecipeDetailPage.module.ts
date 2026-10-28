import { useRecipeNavigation } from "@/features/recipes/recipeNavigation";
import {
  useAuth,
  useCurrentShop,
  useShopMemberships,
} from "@/features/auth/supabase";
import {
  useDeleteRecipe,
  useRecipe,
  useVerifyRecipe,
} from "@/features/recipes/recipesApi";
import {
  ingredientIsLinked,
  ingredientLinkSummary,
} from "@/features/recipes/selectors";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function useRecipeDetailPage() {
  const { id = "" } = useParams();

  const { user, token } = useAuth();

  const { memberships, activeShopId } = useShopMemberships(user?.id);

  const shop = useCurrentShop(memberships, activeShopId);

  const recipeQuery = useRecipe(token, activeShopId, id);

  const sourceRecipe = recipeQuery.data?.recipe;
  const recipe = sourceRecipe
    ? {
        ...sourceRecipe,
        costing: {
          ...sourceRecipe.costing,
          ingredients: sourceRecipe.costing.ingredients.map((ingredient) => ({
            ...ingredient,
            isLinked: ingredientIsLinked(ingredient),
          })),
        },
      }
    : null;

  const verifyMutation = useVerifyRecipe(token, activeShopId);

  const deleteMutation = useDeleteRecipe(token, activeShopId);

  /** Kept apart from `error`: a failed verify belongs next to its button, not
   *  in the load-error slot whose retry only refetches the recipe. */
  const [verifyError, setVerifyError] = useState<string | null>(null);

  /** Same slot pattern as verify: a failed delete belongs next to its button. */
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loading = recipeQuery.isLoading && !recipe;

  const error = recipeQuery.error
    ? recipeQuery.error instanceof Error
      ? recipeQuery.error.message
      : "Could not load the recipe."
    : null;

  const currency = shop?.currency ?? "USD";

  const { close, edit: openEditor } = useRecipeNavigation();

  const navigate = useNavigate();

  // Verification is an owner/admin action server-side, so a member would only
  // ever earn a 403 from a button they could see.
  const role = memberships.find((row) => row.shopId === activeShopId)?.role;

  const canVerify = role === "owner" || role === "admin";

  // Polling while the worker is extracting is baked into the query hook:
  // it keeps a quiet 3s refetch while status is pending/processing.

  /**
   * Publishing an extracted recipe: the server flips `unverified → verified`,
   * which is what makes it orderable (GET /recipes/orderable only returns
   * verified recipes). Ingredients are sent as an empty object because the
   * endpoint's body is an object even though every field is optional.
   */
  const verify = async () => {
    if (
      !token ||
      !activeShopId ||
      !id ||
      !canVerify ||
      verifyMutation.isPending
    )
      return;

    setVerifyError(null);
    try {
      await verifyMutation.mutateAsync({ id });
    } catch (cause) {
      setVerifyError(
        cause instanceof Error ? cause.message : "Could not verify the recipe.",
      );
    }
  };

  const steps = (recipe?.steps ?? []).map((step) => step.instruction);

  /**
   * Try-hard → fallback-soft lives server-side (DELETE /recipes/:id returns
   * `{ mode: 'hard' | 'soft' }`): unreferenced recipes are removed outright
   * with their ingredients + R2 object, while a recipe order lines still point
   * at (FK 23503) is deactivated instead. Either way it leaves this list, so
   * success navigates back. No status gate here — every status is deletable.
   */
  const remove = async () => {
    if (
      !token ||
      !activeShopId ||
      !id ||
      !canVerify ||
      deleteMutation.isPending
    )
      return;
    if (
      !window.confirm(
        "Delete this recipe? If it has sales history it will be deactivated instead of permanently removed.",
      )
    ) {
      return;
    }

    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync({ id });
      navigate("/catalog?tab=recipes", { replace: true });
    } catch (cause) {
      setDeleteError(
        cause instanceof Error ? cause.message : "Could not delete the recipe.",
      );
    }
  };

  const { total, linked, incomplete } = recipe
    ? ingredientLinkSummary(recipe.costing)
    : { total: 0, linked: 0, incomplete: false };
  const [costWarningDismissedFor, setCostWarningDismissedFor] = useState<
    string | null
  >(null);
  const [costWarningExitingFor, setCostWarningExitingFor] = useState<
    string | null
  >(null);
  const showCostWarning =
    canVerify &&
    recipe?.status === "unverified" &&
    incomplete &&
    costWarningDismissedFor !== id;
  const costWarningExiting = showCostWarning && costWarningExitingFor === id;

  useEffect(() => {
    if (!showCostWarning) return;
    const exitTimeout = window.setTimeout(
      () => setCostWarningExitingFor(id),
      2000,
    );
    const dismissTimeout = window.setTimeout(
      () => setCostWarningDismissedFor(id),
      2600,
    );
    return () => {
      window.clearTimeout(exitTimeout);
      window.clearTimeout(dismissTimeout);
    };
  }, [id, showCostWarning]);

  const handleRetry = () => {
    void recipeQuery.refetch();
  };
  const verifyPending = verifyMutation.isPending;
  const deletePending = deleteMutation.isPending;
  const edit = (ingredient?: number) => {
    if (!canVerify || !id) return;
    openEditor(ingredient);
  };
  return {
    token,
    activeShopId,
    edit,
    recipe,
    verifyError,
    deleteError,
    loading,
    error,
    currency,
    close,
    canVerify,
    verify,
    steps,
    remove,
    total,
    linked,
    incomplete,
    showCostWarning,
    costWarningExiting,
    handleRetry,
    verifyPending,
    deletePending,
  };
}
export type RecipeDetailPageModel = ReturnType<typeof useRecipeDetailPage>;
