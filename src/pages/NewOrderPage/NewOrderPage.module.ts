import type { FormField } from '@/components/FormFields/schema';
import { validateFields } from '@/components/FormFields/schema';
import { useAuth, useCurrentShop, useShopMemberships } from '@/features/auth/supabase';
import { useCreateOrder, useOrderQuote } from '@/features/orders/ordersApi';
import type { OrderableRecipe } from '@/features/orders/types';
import { useOrderableRecipes } from '@/features/recipes/recipesApi';
import { toNumber } from '@/lib/format';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
type DraftLine = { recipe: OrderableRecipe; quantity: number };

const today = () => new Date().toISOString().slice(0, 10);
export function useNewOrderPage() {
  const { user, token, loading: authLoading } = useAuth();

  const { memberships, activeShopId, loading: shopsLoading } = useShopMemberships(user?.id);

  const shop = useCurrentShop(memberships, activeShopId);

  const navigate = useNavigate();

  const [lines, setLines] = useState<DraftLine[]>([]);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');

  const [orderDate, setOrderDate] = useState(today);

  const [destinationAddress, setDestinationAddress] = useState('');

  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState('0');

  const currency = shop?.currency ?? 'USD';

  const recipesQuery = useOrderableRecipes(token, activeShopId);

  const recipes = recipesQuery.data?.recipes ?? [];

  const loading = recipesQuery.isLoading;

  const itemsError = recipesQuery.error
    ? recipesQuery.error instanceof Error
      ? recipesQuery.error.message
      : 'Could not load recipes.'
    : submitError;

  const items = useMemo(
    () => lines.map((line) => ({ recipeId: line.recipe.id, quantity: line.quantity })),
    [lines],
  );

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
    items: JSON.parse(debouncedItemsKey) as { recipeId: string; quantity: number }[],
    distanceKm: toNumber(debouncedDistanceKm),
    enabled: lines.length > 0,
  });

  const quote = lines.length > 0 ? (quoteQuery.data ?? null) : null;

  const quoteError =
    lines.length === 0
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

  const changeQuantity = (recipe: OrderableRecipe, delta: number) => {
    setLines((current) => {
      const existing = current.find((line) => line.recipe.id === recipe.id);
      const next = Math.max(0, (existing?.quantity ?? 0) + delta);

      if (next === 0) return current.filter((line) => line.recipe.id !== recipe.id);
      if (existing) {
        return current.map((line) =>
          line.recipe.id === recipe.id ? { ...line, quantity: next } : line,
        );
      }
      return [...current, { recipe, quantity: next }];
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !activeShopId || lines.length === 0 || createOrder.isPending) return;

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
        items: lines.map((line) => ({ recipeId: line.recipe.id, quantity: line.quantity })),
      });
      navigate(`/orders/${result.order.id}`, { state: { fresh: true } });
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'Could not save the order.');
    }
  };
  const createOrderPending = createOrder.isPending;
  const handleBack = () => navigate('/orders');

  const formValues = { customerName, orderDate, destinationAddress, deliveryDistanceKm };
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
