import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Button, Field, Input, Textarea } from '../components/ui';
import { EmptyState, FullPageLoader, InlineNotice, Skeleton } from '../components/feedback';
import { apiFetch, type Order, type OrderQuote } from '../lib/api';
import { formatMoney, formatQuantity, toNumber } from '../lib/format';
import { useAuth, useCurrentShop, useShopMemberships } from '../lib/supabase';

type OrderableRecipe = {
  id: string;
  name: string;
  imageUrl: string | null;
  yieldQuantity: string;
  yieldUnit: string;
  unitCost: number;
  retailPrice: number;
};

type DraftLine = { recipe: OrderableRecipe; quantity: number };

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Order capture. Pricing is never computed here: the backend prices each line
 * from live stock cost and the shop target margin, so this screen only collects
 * quantities and shows the quote the server returned.
 */
export function NewOrderPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { memberships, activeShopId, loading: shopsLoading } = useShopMemberships(user?.id);
  const shop = useCurrentShop(memberships, activeShopId);
  const navigate = useNavigate();

  const [recipes, setRecipes] = useState<OrderableRecipe[]>([]);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [orderDate, setOrderDate] = useState(today);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState('0');

  const currency = shop?.currency ?? 'USD';
  const loadKey = `${token ?? ''}:${activeShopId ?? ''}`;

  const items = useMemo(
    () => lines.map((line) => ({ recipeId: line.recipe.id, quantity: line.quantity })),
    [lines],
  );
  const itemsKey = JSON.stringify(items);

  useEffect(() => {
    if (!token || !activeShopId) return;
    const controller = new AbortController();

    setLoading(true);
    setError(null);
    apiFetch<{ recipes: OrderableRecipe[] }>('/recipes/orderable', {
      token,
      shopId: activeShopId,
      signal: controller.signal,
    })
      .then((data) => setRecipes(data.recipes))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Could not load recipes.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [loadKey]);

  /**
   * Pricing comes from POST /orders/quote rather than being recomputed here, so
   * the running total always reflects live stock cost and the shop's margin.
   */
  useEffect(() => {
    if (!token || !activeShopId || lines.length === 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setQuoting(true);
      apiFetch<OrderQuote>('/orders/quote', {
        method: 'POST',
        token,
        shopId: activeShopId,
        signal: controller.signal,
        body: {
          deliveryDistanceKm: toNumber(deliveryDistanceKm),
          items: JSON.parse(itemsKey) as { recipeId: string; quantity: number }[],
        },
      })
        .then(setQuote)
        .catch((cause: unknown) => {
          if (cause instanceof DOMException && cause.name === 'AbortError') return;
          setQuote(null);
          setQuoteError(cause instanceof Error ? cause.message : 'Could not price this order.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setQuoting(false);
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
      setQuoteError(null);
    };
  }, [itemsKey, deliveryDistanceKm, loadKey]);

  const quantityOf = (recipeId: string) =>
    lines.find((line) => line.recipe.id === recipeId)?.quantity ?? 0;

  const changeQuantity = (recipe: OrderableRecipe, delta: number) => {
    setLines((current) => {
      const existing = current.find((line) => line.recipe.id === recipe.id);
      const next = Math.max(0, (existing?.quantity ?? 0) + delta);

      if (next === 0) return current.filter((line) => line.recipe.id !== recipe.id);
      if (existing) {
        return current.map((line) => (line.recipe.id === recipe.id ? { ...line, quantity: next } : line));
      }
      return [...current, { recipe, quantity: next }];
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !activeShopId || lines.length === 0 || saving) return;

    setSaving(true);
    setError(null);
    try {
      const result = await apiFetch<{ order: Order; totals: { netProfit: number } }>('/orders', {
        method: 'POST',
        token,
        shopId: activeShopId,
        body: {
          customerName: customerName.trim() || null,
          orderDate: new Date(`${orderDate}T12:00:00`).toISOString(),
          destinationAddress: destinationAddress.trim() || null,
          deliveryDistanceKm: toNumber(deliveryDistanceKm),
          items: lines.map((line) => ({ recipeId: line.recipe.id, quantity: line.quantity })),
        },
      });
      navigate(`/orders/${result.order.id}`, { state: { fresh: true } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the order.');
      setSaving(false);
    }
  };

  if (authLoading || shopsLoading || !activeShopId) {
    return <FullPageLoader />;
  }

  return (
    <div className="shell">
      <PageHeader title="New order" onBack={() => navigate('/orders')} />

      <form onSubmit={submit} className="flex flex-1 flex-col gap-5 px-5 pb-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-eyebrow font-medium uppercase text-ink-muted">Customer</h2>
          <Field label="Name" htmlFor="customer">
            <Input
              id="customer"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Optional"
              autoComplete="name"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" htmlFor="order-date">
              <Input
                id="order-date"
                type="date"
                value={orderDate}
                onChange={(event) => setOrderDate(event.target.value)}
                required
              />
            </Field>
            <Field label="Distance" htmlFor="distance">
              <Input
                id="distance"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={deliveryDistanceKm}
                onChange={(event) => setDeliveryDistanceKm(event.target.value)}
              />
            </Field>
          </div>
          <Field label="Address" htmlFor="address">
            <Textarea
              id="address"
              rows={2}
              value={destinationAddress}
              onChange={(event) => setDestinationAddress(event.target.value)}
              placeholder="Optional"
              autoComplete="street-address"
            />
          </Field>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-eyebrow font-medium uppercase text-ink-muted">Items</h2>
          {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}

          {loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : recipes.length === 0 ? (
            <EmptyState
              title="No sellable recipes yet"
              body="Add an active recipe with ingredients before recording orders."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {recipes.map((recipe) => {
                const quantity = quantityOf(recipe.id);
                return (
                  <li
                    key={recipe.id}
                    className={`flex items-center gap-3 rounded-card border p-3 transition-colors duration-200 ${
                      quantity > 0 ? 'border-brand-primary bg-surface-card' : 'border-hairline bg-surface-card'
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="truncate text-body font-medium text-ink">{recipe.name}</p>
                      <p className="text-label text-ink-muted">
                        {formatQuantity(recipe.yieldQuantity, recipe.yieldUnit)} ·{' '}
                        {formatMoney(recipe.retailPrice, currency)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Remove one ${recipe.name}`}
                        disabled={quantity === 0}
                        onClick={() => changeQuantity(recipe, -1)}
                        className="pressable h-8 w-8 rounded-pill border border-hairline text-body text-ink disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="min-w-[2ch] text-center text-body font-medium tabular-nums text-ink">
                        {quantity || '–'}
                      </span>
                      <button
                        type="button"
                        aria-label={`Add one ${recipe.name}`}
                        onClick={() => changeQuantity(recipe, 1)}
                        className="pressable h-8 w-8 rounded-pill border border-hairline text-body text-ink"
                      >
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2 rounded-card bg-surface-card p-4">
          {quote ? (
            <>
              <Row
                label="Items"
                value={formatMoney(quote.totalAmount - quote.deliveryFee, currency)}
              />
              <Row label="Delivery" value={formatMoney(quote.deliveryFee, currency)} />
              <div className="h-px bg-hairline" />
              <Row label="Total" value={formatMoney(quote.totalAmount, currency)} emphasis />
              <Row label="Net profit" value={formatMoney(quote.netProfit, currency)} />
              <p className="text-label text-ink-muted">
                Margin {quote.profitMarginPercent.toFixed(1)}% · cost{' '}
                {formatMoney(quote.totalCost, currency)}
              </p>
            </>
          ) : quoteError ? (
            <InlineNotice tone="error">{quoteError}</InlineNotice>
          ) : (
            <p className="py-1 text-label text-ink-muted">
              {quoting ? 'Pricing…' : 'Add an item to see the live quote.'}
            </p>
          )}
        </section>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          block
          loading={saving}
          disabled={lines.length === 0 || quoting || quote === null}
        >
          {lines.length === 0
            ? 'Add at least one item'
            : quoting
              ? 'Pricing…'
              : `Save order · ${formatMoney(quote?.totalAmount ?? 0, currency)}`}
        </Button>
      </form>
    </div>
  );
}

function Row({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={`text-label ${emphasis ? 'font-medium text-ink' : 'text-ink-muted'}`}>{label}</span>
      <span className={emphasis ? 'font-display text-[20px] text-ink' : 'text-body text-ink'}>{value}</span>
    </div>
  );
}