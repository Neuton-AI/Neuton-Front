import { FormFields } from '@/components/FormFields/FormFields';
import { ErrorState, InlineNotice, Skeleton } from '@/components/feedback';
import { Button } from '@/components/ui';
import { useShopTab } from './ShopTab.module';

export function ShopTab({
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
  const {
    fields,
    formValues,
    handleFieldChange,
    errorMessage,
    updateShopPending,
    shop,
    canEdit,
    save,
    shopQueryError,
    handleRetry,
    shopQueryIsLoading,
  } = useShopTab({ token, shopId, role, fallbackName, onSaved, onNotice });
  if (!shopId) {
    return <p className="text-body text-ink-muted">Create a shop to configure its settings.</p>;
  }
  if (shopQueryError && !shop) {
    return (
      <ErrorState
        message={errorMessage ?? 'Could not load shop settings.'}
        onRetry={() => void handleRetry()}
      />
    );
  }
  if (shopQueryIsLoading && !shop) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-[87px]" />
        <Skeleton className="h-[87px]" />
        <Skeleton className="h-[87px]" />
        <Skeleton className="h-[85px]" />
      </div>
    );
  }
  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      {shopQueryError ? (
        <ErrorState
          message={errorMessage ?? 'Could not load shop settings.'}
          onRetry={() => void handleRetry()}
        />
      ) : null}

      {!canEdit ? (
        <InlineNotice tone="info">Only owners and admins can change these settings.</InlineNotice>
      ) : null}

      <FormFields
        fields={fields}
        values={formValues}
        onChange={handleFieldChange}
        disabled={!canEdit}
      />
      {canEdit ? (
        <Button type="submit" size="sm" radius="input" block loading={updateShopPending}>
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
