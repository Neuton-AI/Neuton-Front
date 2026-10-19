import { useAuth, useCurrentShop, useShopMemberships } from '@/features/auth/supabase';
import { useDeleteRecipe, useRecipe, useUpdateRecipe } from '@/features/recipes/recipesApi';
import { ingredientLinkSummary } from '@/features/recipes/selectors';
import type { Recipe } from '@/features/recipes/types';
import { formatQuantity, toNumber } from '@/lib/format';
import { useMutationState } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const ALLERGEN_CATALOG = [
  'Gluten',
  'Eggs',
  'Dairy',
  'Tree nuts',
  'Peanuts',
  'Soy',
  'Sesame',
  'Fish',
  'Shellfish',
  'Mustard',
  'Celery',
  'Sulphites',
  'Lupin',
  'Molluscs',
];

export type IngredientFormRow = {
  rowKey: string;
  id: string | null;
  rawName: string;
  quantity: string;
  unit: string;
  inventoryItemId: string | null;
  generalPriceId: string | null;
  rawMaterialName: string | null;
};

export type StepFormRow = { rowKey: string; instruction: string };

let tempRowSequence = 0;
function nextRowKey(prefix: string): string {
  tempRowSequence += 1;
  return `${prefix}-${tempRowSequence}`;
}

function toIngredientRows(recipe: Recipe): IngredientFormRow[] {
  return recipe.costing.ingredients.map((ingredient) => ({
    rowKey: ingredient.id ?? nextRowKey('row'),
    id: ingredient.id ?? null,
    rawName: ingredient.rawName ?? ingredient.name,
    quantity: String(ingredient.quantity),
    unit: ingredient.rawSrcUnit,
    inventoryItemId: ingredient.inventoryItemId ?? null,
    generalPriceId: ingredient.generalPriceId ?? null,
    rawMaterialName: ingredient.rawMaterialName ?? null,
  }));
}

function toStepRows(recipe: Recipe): StepFormRow[] {
  return [...recipe.steps]
    .sort((a, b) => a.stepNumber - b.stepNumber)
    .map((step) => ({ rowKey: nextRowKey('step'), instruction: step.instruction }));
}

function emptyIngredientRow(): IngredientFormRow {
  return {
    rowKey: nextRowKey('row'),
    id: null,
    rawName: '',
    quantity: '',
    unit: 'g',
    inventoryItemId: null,
    generalPriceId: null,
    rawMaterialName: null,
  };
}

function validateForm(
  recipeName: string,
  yieldQty: string,
  ingredientRows: IngredientFormRow[],
): string[] {
  const problems: string[] = [];
  if (!recipeName.trim()) problems.push('Recipe name is required.');
  if (toNumber(yieldQty) <= 0) problems.push('Serves must be greater than 0.');
  if (ingredientRows.length === 0) problems.push('Add at least one ingredient.');
  ingredientRows.forEach((row, index) => {
    const label = row.rawName.trim() || `Ingredient ${index + 1}`;
    if (!row.rawName.trim()) problems.push(`${label}: name is required.`);
    if (!row.quantity.trim() || toNumber(row.quantity) <= 0) {
      problems.push(`${label}: quantity must be greater than 0.`);
    }
    if (!row.unit.trim()) problems.push(`${label}: unit is required.`);
  });
  return problems;
}

export function useRecipeEditPage() {
  const { id = '' } = useParams();

  const { user, token } = useAuth();

  const { memberships, activeShopId } = useShopMemberships(user?.id);

  const shop = useCurrentShop(memberships, activeShopId);

  const navigate = useNavigate();

  const recipeQuery = useRecipe(token, activeShopId, id);

  const recipe = recipeQuery.data?.recipe ?? null;

  const updateMutation = useUpdateRecipe(token, activeShopId);

  const deleteMutation = useDeleteRecipe(token, activeShopId);

  const role = memberships.find((row) => row.shopId === activeShopId)?.role;

  const canEdit = role === 'owner' || role === 'admin';

  const isReviewedState = recipe?.status === 'verified' || recipe?.status === 'unverified';

  const redirectTarget =
    recipe && (!canEdit || !isReviewedState) ? `/catalog/recipes/${id}` : null;

  const [recipeName, setRecipeName] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [yieldQty, setYieldQty] = useState('');
  const [ingredientRows, setIngredientRows] = useState<IngredientFormRow[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [stepRows, setStepRows] = useState<StepFormRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activePane, setActivePane] = useState(0);

  const seededForRef = useRef<string | null>(null);
  const swipeRef = useRef<HTMLDivElement>(null);
  const paneRefs = useRef<(HTMLDivElement | null)[]>([]);

  const seedForm = useCallback((source: Recipe) => {
    setRecipeName(source.name);
    setPrepTime(String(source.prepTimeMinutes ?? ''));
    setYieldQty(formatQuantity(source.yieldQuantity));
    setIngredientRows(toIngredientRows(source));
    setAllergens(source.allergens ?? []);
    setStepRows(toStepRows(source));
    setValidationErrors([]);
    setSaveError(null);
  }, []);

  // Seed once per recipe id: a background refetch must never clobber edits
  // the merchant has typed but not saved yet. Reset calls seedForm directly.
  useEffect(() => {
    if (!recipe || seededForRef.current === recipe.id) return;
    seededForRef.current = recipe.id;
    seedForm(recipe);
  }, [recipe, seedForm]);

  // A barcode link landing from the scan screen refreshes only the link
  // fields; the merchant's name/quantity/unit edits stay untouched.
  useEffect(() => {
    if (!recipe) return;
    setIngredientRows((rows) => {
      let changed = false;
      const next = rows.map((row) => {
        if (!row.id) return row;
        const fresh = recipe.costing.ingredients.find((ingredient) => ingredient.id === row.id);
        if (!fresh) return row;
        const inventoryItemId = fresh.inventoryItemId ?? null;
        const generalPriceId = fresh.generalPriceId ?? null;
        const rawMaterialName = fresh.rawMaterialName ?? null;
        if (
          row.inventoryItemId === inventoryItemId &&
          row.generalPriceId === generalPriceId &&
          row.rawMaterialName === rawMaterialName
        ) {
          return row;
        }
        changed = true;
        return { ...row, inventoryItemId, generalPriceId, rawMaterialName };
      });
      return changed ? next : rows;
    });
  }, [recipe]);

  // `select` receives the Mutation itself — its key lives on options.mutationKey.
  const pendingLinkIds = useMutationState({
    filters: {
      status: 'pending',
      predicate: (mutation) =>
        mutation.options.mutationKey?.[0] === 'linkIngredient' &&
        mutation.options.mutationKey?.[1] === id,
    },
    select: (mutation) => String(mutation.options.mutationKey?.[2] ?? ''),
  });

  const linkingIngredientIds = useMemo(() => new Set(pendingLinkIds), [pendingLinkIds]);

  const updateIngredientRow = useCallback((rowKey: string, patch: Partial<IngredientFormRow>) => {
    setIngredientRows((rows) =>
      rows.map((row) => (row.rowKey === rowKey ? { ...row, ...patch } : row)),
    );
  }, []);

  const addIngredientRow = useCallback(() => {
    setIngredientRows((rows) => [...rows, emptyIngredientRow()]);
  }, []);

  const removeIngredientRow = useCallback((rowKey: string) => {
    setIngredientRows((rows) => rows.filter((row) => row.rowKey !== rowKey));
  }, []);

  const updateStep = useCallback((rowKey: string, instruction: string) => {
    setStepRows((rows) =>
      rows.map((row) => (row.rowKey === rowKey ? { ...row, instruction } : row)),
    );
  }, []);

  const addStep = useCallback(() => {
    setStepRows((rows) => [...rows, { rowKey: nextRowKey('step'), instruction: '' }]);
  }, []);

  const removeStep = useCallback((rowKey: string) => {
    setStepRows((rows) => rows.filter((row) => row.rowKey !== rowKey));
  }, []);

  const toggleAllergen = useCallback((allergen: string) => {
    setAllergens((current) =>
      current.includes(allergen)
        ? current.filter((value) => value !== allergen)
        : [...current, allergen],
    );
  }, []);

  const allergenOptions = useMemo(() => {
    const merged = new Set(ALLERGEN_CATALOG);
    for (const allergen of recipe?.allergens ?? []) merged.add(allergen);
    return [...merged];
  }, [recipe]);

  const currency = shop?.currency ?? 'USD';

  const incomplete = recipe ? ingredientLinkSummary(recipe.costing).incomplete : false;

  const save = async () => {
    if (!token || !activeShopId || !id || updateMutation.isPending) return;
    const problems = validateForm(recipeName, yieldQty, ingredientRows);
    setValidationErrors(problems);
    setSaveError(null);
    if (problems.length > 0) return;
    try {
      await updateMutation.mutateAsync({
        id,
        fields: {
          name: recipeName.trim(),
          prepTimeMinutes: toNumber(prepTime),
          yieldQuantity: toNumber(yieldQty),
          allergens,
          steps: stepRows
            .filter((step) => step.instruction.trim())
            .map((step, index) => ({ stepNumber: index + 1, instruction: step.instruction })),
          ingredients: ingredientRows.map((row) => ({
            inventoryItemId: row.inventoryItemId ?? null,
            generalPriceId: row.generalPriceId ?? null,
            rawName: row.rawName.trim(),
            ...(row.rawMaterialName ? { rawMaterialName: row.rawMaterialName } : {}),
            quantity: toNumber(row.quantity),
            rawSrcUnit: row.unit.trim(),
          })),
        },
      });
      navigate(-1);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Could not save the recipe.');
    }
  };

  const reset = useCallback(() => {
    if (recipe) seedForm(recipe);
  }, [recipe, seedForm]);

  const confirmDelete = async () => {
    if (!token || !activeShopId || !id || deleteMutation.isPending) return;
    setDeleteDialogOpen(false);
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync({ id });
      navigate('/catalog?tab=recipes', { replace: true });
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Could not delete the recipe.');
    }
  };

  const openScanner = useCallback(
    (row: IngredientFormRow) => {
      if (!row.id) return;
      navigate(`/catalog/recipes/${id}/edit/ingredients/${row.id}/scan`);
    },
    [id, navigate],
  );

  const handleSwipeScroll = useCallback(() => {
    const container = swipeRef.current;
    if (!container || container.clientWidth === 0) return;
    const index = Math.round(container.scrollLeft / container.clientWidth);
    setActivePane(Math.min(Math.max(index, 0), 1));
  }, []);

  const goToPane = useCallback((index: number) => {
    setActivePane(index);
    // Optional call: jsdom has no scrollIntoView, and pane state is already
    // updated above, so tests and screen readers never depend on the scroll.
    paneRefs.current[index]?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'start',
    });
  }, []);

  const paneRef = useCallback(
    (index: number) => (element: HTMLDivElement | null) => {
      paneRefs.current[index] = element;
    },
    [],
  );

  const loading = recipeQuery.isLoading && !recipe;

  const error = recipeQuery.error
    ? recipeQuery.error instanceof Error
      ? recipeQuery.error.message
      : 'Could not load the recipe.'
    : null;

  const retry = () => {
    void recipeQuery.refetch();
  };

  const close = () => navigate(-1);

  return {
    recipe,
    loading,
    error,
    retry,
    redirectTarget,
    recipeName,
    setRecipeName,
    prepTime,
    setPrepTime,
    yieldQty,
    setYieldQty,
    ingredientRows,
    addIngredientRow,
    updateIngredientRow,
    removeIngredientRow,
    linkingIngredientIds,
    allergenOptions,
    allergens,
    toggleAllergen,
    stepRows,
    addStep,
    updateStep,
    removeStep,
    currency,
    incomplete,
    save,
    reset,
    validationErrors,
    saveError,
    savePending: updateMutation.isPending,
    deleteDialogOpen,
    requestDelete: () => setDeleteDialogOpen(true),
    cancelDelete: () => setDeleteDialogOpen(false),
    confirmDelete,
    deleteError,
    deletePending: deleteMutation.isPending,
    activePane,
    goToPane,
    swipeRef,
    handleSwipeScroll,
    paneRef,
    openScanner,
    close,
  };
}

export type RecipeEditPageModel = ReturnType<typeof useRecipeEditPage>;
