import type React from "react";
import { FormFields } from "@/components/FormFields/FormFields";
import { ErrorState, InlineNotice, Skeleton } from "@/components/feedback";
import { Button } from "@/components/ui";
import { DeleteShopDialog } from "./DeleteShopDialog";
import { useShopTab } from "./ShopTab.module";

interface IShopTab {
  userId: string | null;
  shopId: string | null;
  role: "owner" | "admin" | "member" | undefined;
  fallbackName: string | undefined;
  onSaved: () => void;
  onNotice: (message: string) => void;
}

export const ShopTab: React.FC<IShopTab> = ({
  userId,
  shopId,
  role,
  fallbackName,
  onSaved,
  onNotice,
}) => {
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
    canDelete,
    shopName,
    deleteOpen,
    typedName,
    setTypedName,
    deleteMessage,
    confirmDeleteDisabled,
    deletePending,
    openDelete,
    closeDelete,
    confirmDelete,
  } = useShopTab({ userId, shopId, role, fallbackName, onSaved, onNotice });
  if (!shopId) {
    return (
      <p className="text-body text-ink-muted">
        Create a shop to configure its settings.
      </p>
    );
  }
  if (shopQueryError && !shop) {
    return (
      <ErrorState
        message={errorMessage ?? "Could not load shop settings."}
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
    <div className="flex flex-col gap-8">
    <form onSubmit={save} className="flex flex-col gap-3">
      {shopQueryError ? (
        <ErrorState
          message={errorMessage ?? "Could not load shop settings."}
          onRetry={() => void handleRetry()}
        />
      ) : null}

      {!canEdit ? (
        <InlineNotice tone="info">
          Only owners and admins can change these settings.
        </InlineNotice>
      ) : null}

      <FormFields
        fields={fields}
        values={formValues}
        onChange={handleFieldChange}
        disabled={!canEdit}
      />
      {canEdit ? (
        <Button
          type="submit"
          size="sm"
          radius="input"
          block
          loading={updateShopPending}
        >
          Save changes
        </Button>
      ) : (
        <p className="text-label text-ink-muted-soft">
          {shop?.name ?? fallbackName} is managed by your shop owner.
        </p>
      )}
    </form>
    {canDelete ? (
      <section className="flex flex-col gap-3 border-t border-hairline pt-6">
        <h2 className="text-[16px] font-bold text-ink">Danger Zone</h2>
        <p className="text-body text-ink-muted">
          Delete this shop permanently. This cannot be undone.
        </p>
        <Button type="button" variant="danger" size="sm" radius="input" onClick={openDelete}>
          Delete shop
        </Button>
      </section>
    ) : null}
    <DeleteShopDialog
      open={deleteOpen}
      shopName={shopName}
      typedName={typedName}
      message={deleteMessage}
      pending={deletePending}
      confirmDisabled={confirmDeleteDisabled}
      onTypedName={setTypedName}
      onConfirm={() => void confirmDelete()}
      onCancel={closeDelete}
    />
    </div>
  );
};
