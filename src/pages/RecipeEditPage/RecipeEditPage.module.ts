import { useAuth, useShopMemberships } from '@/features/auth/supabase';
import {
  useBarcodePrice,
  useManualProduct,
  useDeleteRecipe,
  useRecipe,
  useUpdateRecipe,
} from '@/features/recipes/recipesApi';
import { ingredientIsLinked } from '@/features/recipes/selectors';
import { useRecipeNavigation } from '@/features/recipes/recipeNavigation';
import type { Recipe, RecipeUpdate, ManualProductInput } from '@/features/recipes/types';
import { useEffect, useRef, useState, type KeyboardEvent, type UIEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

type IngredientDraft = {
  key: string;
  rawName: string;
  rawMaterialName: string;
  quantity: string;
  rawSrcUnit: string;
  inventoryItemId: string | null;
  generalPriceId: string | null;
  linked?: boolean;
};
type Draft = {
  name: string;
  imageUrl: string;
  prepTimeMinutes: string;
  yieldQuantity: string;
  yieldUnit: string;
  allergens: string[];
  steps: string[];
  ingredients: IngredientDraft[];
};

function recipeDraft(recipe: Recipe): Draft {
  return {
    name: recipe.name,
    imageUrl: recipe.imageUrl ?? '',
    prepTimeMinutes: String(recipe.prepTimeMinutes),
    yieldQuantity: String(recipe.yieldQuantity),
    yieldUnit: recipe.yieldUnit,
    allergens: [...(recipe.allergens ?? [])],
    steps: recipe.steps.map((step) => step.instruction),
    ingredients: recipe.costing.ingredients.map((ingredient, index) => ({
      key: ingredient.id ?? `original-${index}`,
      rawName: ingredient.rawName ?? ingredient.name,
      rawMaterialName: ingredient.rawMaterialName ?? ingredient.rawName ?? ingredient.name,
      quantity: String(ingredient.quantity),
      rawSrcUnit: ingredient.rawSrcUnit,
      inventoryItemId: ingredient.inventoryItemId ?? null,
      generalPriceId: ingredient.generalPriceId ?? null,
      linked: ingredient.linked,
    })),
  };
}

export function useRecipeEditPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, token, loading: authLoading } = useAuth();
  const { memberships, activeShopId, loading: membershipsLoading } = useShopMemberships(user?.id);
  const role = memberships.find((row) => row.shopId === activeShopId)?.role;
  const canManage = role === 'owner' || role === 'admin';
  const query = useRecipe(token, activeShopId, id);
  const recipe = query.data?.recipe;
  const update = useUpdateRecipe(token, activeShopId);
  const deletion = useDeleteRecipe(token, activeShopId);
  const barcode = useBarcodePrice(token, activeShopId);
  const manual = useManualProduct(token, activeShopId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanKey, setScanKey] = useState<string | null>(null);
  const [editingPhoto, setEditingPhoto] = useState(false);
  const initialized = useRef('');
  const nextKey = useRef(0);
  const scanRequest = useRef(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const focusIngredient = params.get('ingredient');
  const focusedContext = useRef('');
  const busy = update.isPending || deletion.isPending;
  const editorReady =
    Boolean(draft && recipe && canManage) &&
    !authLoading &&
    !membershipsLoading &&
    !query.isLoading;
  const { showDetails } = useRecipeNavigation();

  useEffect(() => {
    carouselRef.current
      ?.querySelectorAll<HTMLElement>('[role="tabpanel"]')
      .forEach((panel, index) => {
        // Keep offscreen form controls out of keyboard navigation as well as the accessibility tree.
        if (index !== page && panel.contains(document.activeElement)) {
          document.getElementById(`recipe-tab-${page}`)?.focus({ preventScroll: true });
        }
        panel.inert = index !== page;
      });
  }, [page, editorReady]);

  useEffect(() => {
    const context = `${activeShopId}:${id}`;
    if (!recipe || initialized.current === context) return;
    initialized.current = context;
    setDraft(recipeDraft(recipe));
    setPage(0);
    setError(null);
    setScanKey(null);
    scanRequest.current += 1;
  }, [recipe, activeShopId, id]);

  useEffect(() => {
    const context = `${activeShopId}:${id}:${focusIngredient}`;
    if (!draft || !focusIngredient || focusedContext.current === context) return;
    const selected =
      draft.ingredients.find((row) => row.key === focusIngredient) ??
      draft.ingredients[Number(focusIngredient)];
    if (selected) document.getElementById(`ingredient-${selected.key}`)?.focus();
    focusedContext.current = context;
  }, [draft, focusIngredient, activeShopId, id]);

  useEffect(
    () => () => {
      scanRequest.current += 1;
    },
    [],
  );

  function changeField<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  function changeIngredient(
    key: string,
    field: 'rawName' | 'quantity' | 'rawSrcUnit',
    value: string,
  ) {
    setDraft((current) =>
      current
        ? {
            ...current,
            ingredients: current.ingredients.map((row) => {
              if (row.key !== key) return row;
              return field === 'rawName'
                ? {
                    ...row,
                    rawName: value,
                    rawMaterialName: value,
                    inventoryItemId: null,
                    generalPriceId: null,
                    linked: false,
                  }
                : { ...row, [field]: value };
            }),
          }
        : current,
    );
  }

  function addIngredient() {
    setDraft((current) =>
      current
        ? {
            ...current,
            ingredients: [
              ...current.ingredients,
              {
                key: `new-${nextKey.current++}`,
                rawName: '',
                rawMaterialName: '',
                quantity: '1',
                rawSrcUnit: 'g',
                inventoryItemId: null,
                generalPriceId: null,
              },
            ],
          }
        : current,
    );
  }

  function removeIngredient(key: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            ingredients: current.ingredients.filter((row) => row.key !== key),
          }
        : current,
    );
  }

  function changeStep(index: number, value: string) {
    if (draft)
      changeField(
        'steps',
        draft.steps.map((step, i) => (i === index ? value : step)),
      );
  }

  function toggleAllergen(allergen: string) {
    if (!draft) return;
    changeField(
      'allergens',
      draft.allergens.includes(allergen)
        ? draft.allergens.filter((item) => item !== allergen)
        : [...draft.allergens, allergen],
    );
  }

  function closeScanner() {
    scanRequest.current += 1;
    setScanKey(null);
    setScanError(null);
  }

  function openScanner(key: string) {
    if (!canManage || busy) return;
    const row = draft?.ingredients.find((ingredient) => ingredient.key === key);
    if (!row || !row.rawMaterialName.trim()) {
      setError('Enter the ingredient name before linking a product.');
      return;
    }
    scanRequest.current += 1;
    setScanError(null);
    setScanKey(key);
  }

  async function linkBarcode(value: string) {
    const row = draft?.ingredients.find((ingredient) => ingredient.key === scanKey);
    if (!row || !canManage || barcode.isPending || !token || !activeShopId) return;
    const request = ++scanRequest.current;
    setScanError(null);
    try {
      const { price } = await barcode.mutateAsync({
        id,
        body: {
          barcode: value,
          rawMaterialName: row.rawMaterialName,
          quantity: Number(row.quantity),
          rawSrcUnit: row.rawSrcUnit,
        },
      });
      if (request !== scanRequest.current) return;
      setDraft((current) =>
        current
          ? {
              ...current,
              ingredients: current.ingredients.map((ingredient) =>
                ingredient.key === row.key
                  ? {
                      key: ingredient.key,
                      rawName: price.rawName,
                      rawMaterialName: price.rawMaterialName,
                      quantity: ingredient.quantity,
                      rawSrcUnit: ingredient.rawSrcUnit,
                      inventoryItemId: null,
                      generalPriceId: price.id,
                      linked: true,
                    }
                  : ingredient,
              ),
            }
          : current,
      );
      closeScanner();
    } catch (cause) {
      if (request === scanRequest.current) {
        setScanError(
          cause instanceof Error ? cause.message : 'Could not find a price for that barcode.',
        );
      }
    }
  }

  async function linkManualProduct(value: Omit<ManualProductInput, 'rawMaterialName'>) {
    const row = draft?.ingredients.find((ingredient) => ingredient.key === scanKey);
    if (!row || !canManage || manual.isPending || !token || !activeShopId) return;
    const request = ++scanRequest.current;
    setScanError(null);
    try {
      const { product, usage } = await manual.mutateAsync({
        id,
        body: {
          ...value,
          rawMaterialName: row.rawMaterialName,
        },
      });
      if (request !== scanRequest.current) return;
      setDraft((current) =>
        current
          ? {
              ...current,
              ingredients: current.ingredients.map((ingredient) =>
                ingredient.key === row.key
                  ? {
                      ...ingredient,
                      rawName: product.name,
                      rawMaterialName: product.rawMaterialName,
                      quantity: String(usage.baseUnitAmount),
                      rawSrcUnit: usage.baseUnit,
                      inventoryItemId: null,
                      generalPriceId: product.id,
                      linked: true,
                    }
                  : ingredient,
              ),
            }
          : current,
      );
      closeScanner();
    } catch (cause) {
      if (request === scanRequest.current) {
        setScanError(cause instanceof Error ? cause.message : 'Could not save product.');
      }
    }
  }

  async function save() {
    if (!draft || !canManage || !token || !activeShopId || busy) return;
    setError(null);
    if (
      !draft.name.trim() ||
      draft.ingredients.length === 0 ||
      draft.ingredients.some(
        (row) =>
          !row.rawName.trim() ||
          !row.rawSrcUnit.trim() ||
          !Number.isFinite(Number(row.quantity)) ||
          Number(row.quantity) <= 0,
      ) ||
      !Number.isFinite(Number(draft.yieldQuantity)) ||
      Number(draft.yieldQuantity) <= 0 ||
      !Number.isInteger(Number(draft.prepTimeMinutes)) ||
      Number(draft.prepTimeMinutes) < 0
    ) {
      setError(
        'Enter a recipe name, valid preparation time and servings, and at least one ingredient with a positive amount and unit.',
      );
      selectPage(0);
      return;
    }
    const body: RecipeUpdate = {
      name: draft.name.trim(),
      imageUrl: draft.imageUrl.trim() || null,
      prepTimeMinutes: Number(draft.prepTimeMinutes),
      yieldQuantity: Number(draft.yieldQuantity),
      yieldUnit: draft.yieldUnit,
      allergens: draft.allergens,
      steps: draft.steps
        .filter((step) => step.trim())
        .map((instruction, index) => ({
          stepNumber: index + 1,
          instruction: instruction.trim(),
        })),
      ingredients: draft.ingredients.map(
        ({
          key: _key,
          linked: _linked,
          quantity,
          ...ingredient
        }) => ({
          ...ingredient,
          quantity: Number(quantity),
        }),
      ),
    };
    try {
      await update.mutateAsync({ id, body });
      showDetails();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the recipe.');
    }
  }

  async function remove() {
    if (!canManage || busy || !token || !activeShopId) return;
    if (
      !window.confirm(
        'Delete this recipe? If it has sales history it will be deactivated instead of permanently removed.',
      )
    )
      return;
    setError(null);
    try {
      await deletion.mutateAsync({ id });
      navigate('/catalog?tab=recipes', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the recipe.');
    }
  }

  function reset() {
    if (!recipe || busy) return;
    closeScanner();
    setDraft(recipeDraft(recipe));
    setError(null);
    setEditingPhoto(false);
  }

  function selectPage(index: number, animate = true) {
    const carousel = carouselRef.current;
    if (!carousel?.clientWidth || !animate) setPage(index);
    // CSS supplies smooth scrolling and the reduced-motion override; keyboard changes stay instant.
    carousel?.scrollTo({
      left: index * carousel.clientWidth,
      behavior: animate ? 'auto' : 'instant',
    });
  }

  function onCarouselScroll(event: UIEvent<HTMLDivElement>) {
    const carousel = event.currentTarget;
    if (carousel.clientWidth > 0) {
      setPage(Math.max(0, Math.min(1, Math.round(carousel.scrollLeft / carousel.clientWidth))));
    }
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === 'ArrowRight') next = Math.min(index + 1, 1);
    else if (event.key === 'ArrowLeft') next = Math.max(index - 1, 0);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 1;
    else return;
    event.preventDefault();
    selectPage(next, false);
    document.getElementById(`recipe-tab-${next}`)?.focus({ preventScroll: true });
  }

  return {
    draft,
    recipe,
    page,
    selectPage,
    error: error ?? (query.error instanceof Error ? query.error.message : null),
    loading: authLoading || membershipsLoading || query.isLoading,
    canManage,
    busy,
    saving: update.isPending,
    changeField,
    changeIngredient,
    addIngredient,
    removeIngredient,
    changeStep,
    toggleAllergen,
    save,
    remove,
    reset,
    close: showDetails,
    retry: () => void query.refetch(),
    carouselRef,
    onCarouselScroll,
    onTabKeyDown,
    isLinked: (ingredient: IngredientDraft) => ingredientIsLinked(ingredient),
    scanKey,
    scanError,
    clearScanError: () => setScanError(null),
    scanBusy: barcode.isPending || manual.isPending,
    scanIngredient: draft?.ingredients.find((ingredient) => ingredient.key === scanKey),
    scanCurrency: memberships.find((row) => row.shopId === activeShopId)?.shops?.currency ?? 'USD',
    linkManualProduct,
    openScanner,
    closeScanner,
    linkBarcode,
    editingPhoto,
    setEditingPhoto,
  };
}

export type RecipeEditPageModel = ReturnType<typeof useRecipeEditPage>;
