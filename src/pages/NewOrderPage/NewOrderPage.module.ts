import type { FormField } from '@/components/FormFields/schema';
import { validateFields } from '@/components/FormFields/schema';
import { useAuth, useCurrentShop, useShopMemberships } from '@/features/auth/supabase';
import { useCreateOrder, useOrderQuote } from '@/features/orders/ordersApi';
import type { OrderableRecipe } from '@/features/orders/types';
import { useOrderableRecipes, useRecipes } from '@/features/recipes/recipesApi';
import { ingredientLinkSummary } from '@/features/recipes/selectors';
import { toNumber } from '@/lib/format';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
type DraftLine = { recipe: OrderableRecipe; quantity: number };
export type NewOrderRecipe = Omit<OrderableRecipe, 'unitCost' | 'retailPrice'> & {
  unitCost: number | null;
  retailPrice: number | null;
  costComplete?: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);
export function useNewOrderPage() {
  const { user, token, loading: authLoading } = useAuth();

  const { memberships, activeShopId, loading: shopsLoading } = useShopMemberships(user?.id);

  const shop = useCurrentShop(memberships, activeShopId);

  const navigate = useNavigate();

  const [draftLines, setLines] = useState<DraftLine[]>([]);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');

  const [orderDate, setOrderDate] = useState(today);

  const [destinationAddress, setDestinationAddress] = useState('');

  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState('0');

  const currency = shop?.currency ?? 'USD';

  const recipesQuery = useOrderableRecipes(token, activeShopId);
  const catalogQuery = useRecipes(token, activeShopId);

  const orderable = recipesQuery.data?.recipes ?? [];
  const incompleteRecipes = (catalogQuery.data?.recipes ?? []).filter(
    (recipe) =>
      recipe.isActive &&
      recipe.status === 'verified' &&
      ingredientLinkSummary(recipe.costing).incomplete,
  );
  const incompleteIds = new Set(incompleteRecipes.map((recipe) => recipe.id));
  const eligibleRecipes = orderable.filter((recipe) => !incompleteIds.has(recipe.id));
  const lines = draftLines.filter((line) =>
    eligibleRecipes.some((recipe) => recipe.id === line.recipe.id),
  );
  const recipes: NewOrderRecipe[] = [
    ...eligibleRecipes,
    ...incompleteRecipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      imageUrl: recipe.imageUrl,
      yieldQuantity: recipe.yieldQuantity,
      yieldUnit: recipe.yieldUnit,
      unitCost: null,
      retailPrice: null,
      costComplete: false,
    })),
  ];

  const loading = recipesQuery.isLoading || catalogQuery.isLoading;

  const recipeError = recipesQuery.error ?? catalogQuery.error;
  const itemsError = recipeError
    ? recipeError instanceof Error
      ? recipeError.message
      : 'Could not load recipes.'
    : submitError;

  const items = lines.map((line) => ({ recipeId: line.recipe.id, quantity: line.quantity }));

  const itemsKey = JSON.stringify(items);

  /**
   * Pricing comes from POST /orders/quote rather than being recomputed here, so
   * the running total always reflects live stock cost and the shop's margin.
   * The inputs are debounced so a burst of +/− clicks or a typed distance fires
   * one request, and the query key changes only once the debounce settles.
   */
  const debouncedItemsKey = useDebouncedValue(itemsKey, 250);

  const debouncedDistanceKm = useDebouncedValue(deliveryDistanceKm, 250);

  const quoteQuery = useOrderQuote(token, activeShopId, {
    items: JSON.parse(debouncedItemsKey) as {
      recipeId: string;
      quantity: number;
    }[],
    distanceKm: toNumber(debouncedDistanceKm),
    enabled: items.length > 0 && debouncedItemsKey === itemsKey,
  });

  const quote =
    items.length > 0 && debouncedItemsKey === itemsKey ? (quoteQuery.data ?? null) : null;

  const quoteError =
    items.length === 0
      ? null
      : quoteQuery.error
        ? quoteQuery.error instanceof Error
          ? quoteQuery.error.message
          : 'Could not price this order.'
        : null;

  const quoting = quoteQuery.isFetching;

  const createOrder = useCreateOrder(token, activeShopId);

  const quantityOf = (recipeId: string) =>
    lines.find((line) => line.recipe.id === recipeId)?.quantity ?? 0;

  const changeQuantity = (recipe: NewOrderRecipe, delta: number) => {
    if (recipe.costComplete === false || incompleteIds.has(recipe.id)) return;
    const eligible = eligibleRecipes.find((item) => item.id === recipe.id);
    if (!eligible) return;
    setLines((current) => {
      const existing = current.find((line) => line.recipe.id === recipe.id);
      const next = Math.max(0, (existing?.quantity ?? 0) + delta);

      if (next === 0) return current.filter((line) => line.recipe.id !== recipe.id);
      if (existing) {
        return current.map((line) =>
          line.recipe.id === recipe.id ? { ...line, quantity: next } : line,
        );
      }
      return [...current, { recipe: eligible, quantity: next }];
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !token ||
      !activeShopId ||
      items.length === 0 ||
      createOrder.isPending
    )
      return;

    const validationError = Object.values(validateFields(fields, formValues))[0];
    if (validationError) {
      setSubmitError(String(validationError));
      return;
    }
    setSubmitError(null);
    try {
      const result = await createOrder.mutateAsync({
        customerName: customerName.trim() || null,
        orderDate: new Date(`${orderDate}T12:00:00`).toISOString(),
        destinationAddress: destinationAddress.trim() || null,
        deliveryDistanceKm: toNumber(deliveryDistanceKm),
        items,
      });
      navigate(`/orders/${result.order.id}`, { state: { fresh: true } });
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'Could not save the order.');
    }
  };
  const createOrderPending = createOrder.isPending;
  const handleBack = () => navigate('/orders');

  const formValues = {
    customerName,
    orderDate,
    destinationAddress,
    deliveryDistanceKm,
  };
  const fields: readonly FormField<typeof formValues>[] = [
    {
      kind: 'input',
      name: 'customerName',
      id: 'customer',
      label: 'Name',
      placeholder: 'Optional',
      autoComplete: 'name',
    },
    {
      kind: 'group',
      name: 'dateDistance',
      className: 'grid grid-cols-2 gap-3',
      fields: [
        {
          kind: 'input',
          name: 'orderDate',
          id: 'order-date',
          label: 'Date',
          type: 'date',
          required: true,
        },
        {
          kind: 'input',
          name: 'deliveryDistanceKm',
          id: 'distance',
          label: 'Distance',
          type: 'number',
          inputMode: 'decimal',
          min: 0,
          step: 0.1,
        },
      ],
    },
    {
      kind: 'textarea',
      name: 'destinationAddress',
      id: 'address',
      label: 'Address',
      rows: 2,
      placeholder: 'Optional',
      autoComplete: 'street-address',
    },
  ];
  const handleFieldChange = (name: keyof typeof formValues, value: string) => {
    const setters = {
      customerName: setCustomerName,
      orderDate: setOrderDate,
      destinationAddress: setDestinationAddress,
      deliveryDistanceKm: setDeliveryDistanceKm,
    };
    setters[name](value);
  };
  const itemFields: readonly FormField<typeof formValues>[] = [{ kind: 'custom', name: 'items' }];
  const quoteSubtotal = quote ? quote.totalAmount - quote.deliveryFee : 0;
  return {
    quoteSubtotal,
    itemFields,
    fields,
    formValues,
    handleFieldChange,
    authLoading,
    activeShopId,
    shopsLoading,
    lines,
    currency,
    recipes,
    loading,
    itemsError,
    quote,
    quoteError,
    quoting,
    quantityOf,
    changeQuantity,
    submit,
    createOrderPending,
    handleBack,
  };
}
export type NewOrderPageModel = ReturnType<typeof useNewOrderPage>;
