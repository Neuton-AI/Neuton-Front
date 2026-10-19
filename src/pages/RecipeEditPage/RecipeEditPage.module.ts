import { useAuth, useCurrentShop, useShopMemberships } from '@/features/auth/supabase';
import {
  useBarcodePrice,
  useDeleteRecipe,
  useRecipe,
  useUpdateRecipe,
} from '@/features/recipes/recipesApi';
import { ingredientIsLinked } from '@/features/recipes/selectors';
import type { Recipe, RecipeUpdate } from '@/features/recipes/types';
import { useShopSettings } from '@/features/shops/shopsApi';
import { useEffect, useRef, useState, type TouchEvent } from 'react';
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
  const currentShop = useCurrentShop(memberships, activeShopId);
  const shopSettings = useShopSettings(token, activeShopId);
  const shop = shopSettings.data?.shop ?? currentShop;
  const role = memberships.find((row) => row.shopId === activeShopId)?.role;
  const canManage = role === 'owner' || role === 'admin';
  const query = useRecipe(token, activeShopId, id);
  const recipe = query.data?.recipe;
  const update = useUpdateRecipe(token, activeShopId);
  const deletion = useDeleteRecipe(token, activeShopId);
  const barcode = useBarcodePrice(token, activeShopId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanKey, setScanKey] = useState<string | null>(null);
  const [editingPhoto, setEditingPhoto] = useState(false);
  const initialized = useRef('');
  const nextKey = useRef(0);
  const scanRequest = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const focusIngredient = params.get('ingredient');
  const focusedContext = useRef('');
  const busy = update.isPending || deletion.isPending;
  const detailPath = `/catalog/recipes/${id}`;

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
    if (
      !row ||
      !row.rawMaterialName.trim() ||
      !row.rawSrcUnit.trim() ||
      Number(row.quantity) <= 0
    ) {
      setError('Enter the ingredient name, amount and unit before scanning.');
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
                  ? { ...ingredient, inventoryItemId: null, generalPriceId: price.id, linked: true }
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
      setPage(0);
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
        .map((instruction, index) => ({ stepNumber: index + 1, instruction: instruction.trim() })),
      ingredients: draft.ingredients.map(
        ({ key: _key, linked: _linked, quantity, ...ingredient }) => ({
          ...ingredient,
          quantity: Number(quantity),
        }),
      ),
    };
    try {
      await update.mutateAsync({ id, body });
      navigate(detailPath, { replace: true });
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

  function onTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }
  function onTouchEnd(event: TouchEvent) {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(touch.clientY - start.y) * 1.5)
      setPage(dx < 0 ? 1 : 0);
  }

  return {
    draft,
    recipe,
    page,
    setPage,
    error: error ?? (query.error instanceof Error ? query.error.message : null),
    loading: authLoading || membershipsLoading || query.isLoading,
    canManage,
    busy,
    saving: update.isPending,
    currency: shop?.currency ?? 'USD',
    laborCost: shopSettings.data
      ? (Number(draft?.prepTimeMinutes ?? 0) / 60) * Number(shopSettings.data.shop.hourlyLaborCost)
      : null,
    changeField,
    changeIngredient,
    addIngredient,
    removeIngredient,
    changeStep,
    toggleAllergen,
    save,
    remove,
    reset,
    close: () => navigate(detailPath),
    retry: () => void query.refetch(),
    onTouchStart,
    onTouchEnd,
    isLinked: (ingredient: IngredientDraft) => ingredientIsLinked(ingredient),
    scanKey,
    scanError,
    scanBusy: barcode.isPending,
    openScanner,
    closeScanner,
    linkBarcode,
    editingPhoto,
    setEditingPhoto,
  };
}

export type RecipeEditPageModel = ReturnType<typeof useRecipeEditPage>;
