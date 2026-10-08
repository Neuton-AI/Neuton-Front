import { useEffect, useState } from 'react';
import { BottomNav } from '../components/BottomNav';
import { ErrorState, InlineNotice, Skeleton } from '../components/feedback';
import { IconLogout, IconStore } from '../components/icons';
import { PageHeader } from '../components/PageHeader';
import { Button, Field, Input } from '../components/ui';
import { toNumber } from '../lib/format';
import { useCreateShop, useShopSettings, useUpdateShop } from '../lib/queries';
import { supabase, useAuth, useCurrentShop, useShopMemberships } from '../lib/supabase';

type Tab = 'me' | 'shop';

export function ProfilePage() {
  const { user, token } = useAuth();
  const { memberships, activeShopId, setActiveShopId, reload } = useShopMemberships(user?.id);
  const activeShop = useCurrentShop(memberships, activeShopId);
  const [tab, setTab] = useState<Tab>('me');
  const [notice, setNotice] = useState<string | null>(null);

  const signOut = async () => {
    await supabase?.auth.signOut();
    window.location.assign('/signin');
  };

  const createShopMutation = useCreateShop(token);

  const createShop = async (name: string) => {
    if (!token || createShopMutation.isPending || name.trim().length < 2) return;
    setNotice(null);
    try {
      const { shop } = await createShopMutation.mutateAsync(name.trim());
      // Memberships are an external hook, not a query we invalidate, so the
      // new membership has to be pulled in by hand before switching to it.
      await reload();
      setActiveShopId(shop.id);
      setNotice(`${shop.name} is ready.`);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Could not create the shop.');
    }
  };

  return (
    <div className="shell">
      <div className="flex-1 px-4 pb-32 pt-[max(var(--safe-top)+44px,44px)]">
        <PageHeader eyebrow="Account & shop" title="Profile" />

        <div
          role="tablist"
          aria-label="Profile section"
          className="mt-3 flex gap-1 rounded-card border border-hairline bg-surface-soft p-1"
        >
          {(['me', 'shop'] as const).map((key) => (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-input px-3.5 py-2 text-body font-medium capitalize transition-colors duration-200 ${
                tab === key ? 'bg-surface-card text-ink' : 'text-ink-muted'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="mt-3">
          {tab === 'me' ? (
            <MeTab
              email={user?.email ?? '—'}
              memberships={memberships}
              activeShopId={activeShopId}
              creating={createShopMutation.isPending}
              onSelectShop={(shopId, name) => {
                setActiveShopId(shopId);
                setNotice(`Switched to ${name}.`);
              }}
              onCreateShop={(name) => void createShop(name)}
            />
          ) : (
            <ShopTab
              token={token}
              shopId={activeShopId}
              role={memberships.find((m) => m.shopId === activeShopId)?.role}
              fallbackName={activeShop?.name}
              onSaved={() => setNotice('Shop settings saved.')}
              onNotice={setNotice}
            />
          )}
        </div>

        {notice ? <InlineNotice tone="success">{notice}</InlineNotice> : null}

        <button
          type="button"
          onClick={() => void signOut()}
          className="pressable mt-5 flex w-full items-center justify-center gap-2 rounded-pill border border-hairline py-3 text-body font-medium text-ink"
        >
          <IconLogout className="h-5 w-5" />
          Sign out
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

function MeTab({
  email,
  memberships,
  activeShopId,
  creating,
  onSelectShop,
  onCreateShop,
}: {
  email: string;
  memberships: ReturnType<typeof useShopMemberships>['memberships'];
  activeShopId: string | null;
  creating: boolean;
  onSelectShop: (shopId: string, name: string) => void;
  onCreateShop: (name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-1 rounded-card bg-surface-card p-4">
        <p className="eyebrow">Signed in as</p>
        <p className="truncate text-body font-medium text-ink">{email}</p>
      </section>

      <section>
        <h2 className="eyebrow">Your shops</h2>
        <div className="mt-2 flex flex-col gap-2">
          {memberships.length === 0 ? (
            <CreateShopForm busy={creating} onSubmit={onCreateShop} />
          ) : (
            memberships.map(({ shopId, role, shops }) => {
              const selected = shopId === activeShopId;
              return (
                <button
                  key={shopId}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectShop(shopId, shops.name)}
                  className={`pressable flex w-full items-center gap-3 rounded-card p-4 text-left ${
                    selected ? 'bg-surface-dark text-ink-on-dark' : 'bg-surface-card text-ink'
                  }`}
                >
                  <IconStore
                    className={`h-5 w-5 shrink-0 ${
                      selected ? 'text-ink-on-dark-soft' : 'text-ink-muted'
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[20px] leading-tight">
                      {shops.name}
                    </span>
                    <span
                      className={`block text-label ${
                        selected ? 'text-ink-on-dark-soft' : 'text-ink-muted'
                      }`}
                    >
                      {role[0]?.toUpperCase()}
                      {role.slice(1)} · {shops.currency}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * GET /shop drives the form; PATCH /shop is owner/admin only, so members get a
 * read-only view rather than a form that fails on submit.
 */
function ShopTab({
  token,
  shopId,
  role,
  fallbackName,
  onSaved,
  onNotice,
}: {
  token: string | null;
  shopId: string | null;
  role: 'owner' | 'admin' | 'member' | undefined;
  fallbackName: string | undefined;
  onSaved: () => void;
  onNotice: (message: string) => void;
}) {
  const shopQuery = useShopSettings(token, shopId);
  const updateShop = useUpdateShop(token, shopId);
  const shop = shopQuery.data?.shop ?? null;
  const [form, setForm] = useState({
    storeAddress: '',
    targetProfitMargin: '',
    hourlyLaborCost: '',
    deliveryBaseFee: '',
    deliveryRatePerKm: '',
  });

  const canEdit = role === 'owner' || role === 'admin';

  // The query starts empty, so the form is seeded once the row lands. Seeding
  // keys off the row's id (never the row object) so a successful save — which
  // swaps in the updated row — cannot clobber text the user is still typing.
  useEffect(() => {
    if (!shop) return;
    setForm({
      storeAddress: shop.storeAddress ?? '',
      targetProfitMargin: toNumber(shop.targetProfitMargin).toString(),
      hourlyLaborCost: toNumber(shop.hourlyLaborCost).toFixed(2),
      deliveryBaseFee: toNumber(shop.deliveryBaseFee).toFixed(2),
      deliveryRatePerKm: toNumber(shop.deliveryRatePerKm).toFixed(2),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !shopId || updateShop.isPending) return;

    try {
      await updateShop.mutateAsync({
        storeAddress: form.storeAddress.trim() || null,
        targetProfitMargin: Number(form.targetProfitMargin),
        hourlyLaborCost: Number(form.hourlyLaborCost),
        deliveryBaseFee: Number(form.deliveryBaseFee),
        deliveryRatePerKm: Number(form.deliveryRatePerKm),
      });
      onSaved();
    } catch (cause) {
      onNotice(cause instanceof Error ? cause.message : 'Could not save shop settings.');
    }
  };

  if (!shopId) {
    return <p className="text-body text-ink-muted">Create a shop to configure its settings.</p>;
  }

  if (shopQuery.error && !shop) {
    return (
      <ErrorState
        message={
          shopQuery.error instanceof Error
            ? shopQuery.error.message
            : 'Could not load shop settings.'
        }
        onRetry={() => void shopQuery.refetch()}
      />
    );
  }

  if (shopQuery.isLoading && !shop) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-[87px]" />
        <Skeleton className="h-[87px]" />
        <Skeleton className="h-[87px]" />
        <Skeleton className="h-[85px]" />
      </div>
    );
  }

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      {shopQuery.error ? (
        <ErrorState
          message={
            shopQuery.error instanceof Error
              ? shopQuery.error.message
              : 'Could not load shop settings.'
          }
          onRetry={() => void shopQuery.refetch()}
        />
      ) : null}

      {!canEdit ? (
        <InlineNotice tone="info">
          Only owners and admins can change these settings.
        </InlineNotice>
      ) : null}

      <Field
        label="Store address"
        htmlFor="shop-address"
        hint="Origin point for delivery distance calculations."
      >
        <Input
          id="shop-address"
          dense
          disabled={!canEdit}
          value={form.storeAddress}
          onChange={set('storeAddress')}
          placeholder="18 Market Street, Riverside"
          maxLength={300}
        />
      </Field>

      <Field
        label="Target profit margin"
        htmlFor="shop-margin"
        hint="Default margin used to auto-calculate retail prices."
      >
        <Input
          id="shop-margin"
          dense
          disabled={!canEdit}
          type="number"
          inputMode="decimal"
          min={0}
          max={999}
          step="0.5"
          value={form.targetProfitMargin}
          onChange={set('targetProfitMargin')}
        />
      </Field>

      <Field
        label="Hourly operating / labor cost"
        htmlFor="shop-labor"
        hint="Used for preparation time costs."
      >
        <Input
          id="shop-labor"
          dense
          disabled={!canEdit}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.25"
          value={form.hourlyLaborCost}
          onChange={set('hourlyLaborCost')}
        />
      </Field>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="eyebrow">Delivery rate engine</legend>
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="shop-base-fee" className="text-label font-medium text-ink-muted">
              Base fee
            </label>
            <Input
              id="shop-base-fee"
              dense
              disabled={!canEdit}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.25"
              value={form.deliveryBaseFee}
              onChange={set('deliveryBaseFee')}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="shop-rate-km" className="text-label font-medium text-ink-muted">
              Per km
            </label>
            <Input
              id="shop-rate-km"
              dense
              disabled={!canEdit}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.05"
              value={form.deliveryRatePerKm}
              onChange={set('deliveryRatePerKm')}
            />
          </div>
        </div>
      </fieldset>

      {canEdit ? (
        <Button type="submit" size="sm" radius="input" block loading={updateShop.isPending}>
          Save changes
        </Button>
      ) : (
        <p className="text-label text-ink-muted-soft">
          {shop?.name ?? fallbackName} is managed by your shop owner.
        </p>
      )}
    </form>
  );
}

/** Signup metadata creates the first shop server-side, so this only shows for legacy users. */
function CreateShopForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState('');

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(name);
      }}
      className="flex flex-col gap-3 rounded-card bg-surface-card p-4"
    >
      <p className="text-body text-ink-muted">
        You are not a member of any shop yet. Create one to start tracking.
      </p>
      <Field label="Shop name" htmlFor="new-shop">
        <Input
          id="new-shop"
          dense
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Sunday Bakes"
          minLength={2}
          maxLength={120}
          required
        />
      </Field>
      <Button
        type="submit"
        variant="primary"
        size="md"
        block
        loading={busy}
        disabled={name.trim().length < 2}
      >
        Create shop
      </Button>
    </form>
  );
}