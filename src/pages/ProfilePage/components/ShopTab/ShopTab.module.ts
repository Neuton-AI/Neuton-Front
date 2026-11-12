import type { FormField } from "@/components/FormFields/schema";
import { validateFields } from "@/components/FormFields/schema";
import { useDeleteShop, useShopSettings, useUpdateShop } from "@/features/shops/shopsApi";
import { toNumber } from "@/lib/format";
import { useEffect, useState } from "react";

export function useShopTab({
  userId,
  shopId,
  role,

  onSaved,
  onNotice,
}: {
  userId: string | null;
  shopId: string | null;
  role: "owner" | "admin" | "member" | undefined;
  fallbackName: string | undefined;
  onSaved: () => void;
  onNotice: (message: string) => void;
}) {
  const shopQuery = useShopSettings(userId, shopId);

  const updateShop = useUpdateShop(userId, shopId);
  const deleteShop = useDeleteShop(userId, shopId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  const shop = shopQuery.data?.shop ?? null;
  const shopName = shop?.name ?? "";
  const canDelete = role === "owner" && Boolean(shopId);

  const [form, setForm] = useState({
    storeAddress: "",
    targetProfitMargin: "",
    hourlyLaborCost: "",
    deliveryBaseFee: "",
    deliveryRatePerKm: "",
  });

  const canEdit = role === "owner" || role === "admin";

  // The query starts empty, so the form is seeded once the row lands. Seeding
  // keys off the row's id (never the row object) so a successful save — which
  // swaps in the updated row — cannot clobber text the user is still typing.
  useEffect(() => {
    if (!shop) return;
    setForm({
      storeAddress: shop.storeAddress ?? "",
      targetProfitMargin: toNumber(shop.targetProfitMargin).toString(),
      hourlyLaborCost: toNumber(shop.hourlyLaborCost).toFixed(2),
      deliveryBaseFee: toNumber(shop.deliveryBaseFee).toFixed(2),
      deliveryRatePerKm: toNumber(shop.deliveryRatePerKm).toFixed(2),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || !shopId || !canEdit || updateShop.isPending) return;

    const validationError = Object.values(
      validateFields(fields, formValues),
    )[0];
    if (validationError) {
      onNotice(String(validationError));
      return;
    }
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
      onNotice(
        cause instanceof Error
          ? cause.message
          : "Could not save shop settings.",
      );
    }
  };

  const shopQueryError = shopQuery.error;
  const handleRetry = () => {
    void shopQuery.refetch();
  };
  const shopQueryIsLoading = shopQuery.isLoading;
  const errorMessage =
    shopQuery.error instanceof Error
      ? shopQuery.error.message
      : shopQuery.error
        ? "Could not load shop settings."
        : null;

  const formValues = form;
  const fields: readonly FormField<typeof formValues>[] = [
    {
      kind: "input",
      name: "storeAddress",
      id: "shop-address",
      label: "Store address",
      hint: "Origin point for delivery distance calculations.",
      dense: true,
      placeholder: "18 Market Street, Riverside",
      maxLength: 300,
    },
    {
      kind: "input",
      name: "targetProfitMargin",
      id: "shop-margin",
      label: "Target profit margin",
      hint: "Default margin used to auto-calculate retail prices.",
      dense: true,
      type: "number",
      inputMode: "decimal",
      min: 0,
      max: 999,
      step: 0.5,
    },
    {
      kind: "input",
      name: "hourlyLaborCost",
      id: "shop-labor",
      label: "Hourly operating / labor cost",
      hint: "Used for preparation time costs.",
      dense: true,
      type: "number",
      inputMode: "decimal",
      min: 0,
      step: 0.25,
    },
    {
      kind: "group",
      name: "delivery",
      className: "flex flex-col gap-1.5",
      legend: "Delivery rate engine",
      fields: [
        {
          kind: "group",
          name: "rates",
          className: "flex gap-3",
          fields: [
            {
              kind: "input",
              name: "deliveryBaseFee",
              id: "shop-base-fee",
              label: "Base fee",
              className: "flex-1",
              dense: true,
              type: "number",
              inputMode: "decimal",
              min: 0,
              step: 0.25,
            },
            {
              kind: "input",
              name: "deliveryRatePerKm",
              id: "shop-rate-km",
              label: "Per km",
              className: "flex-1",
              dense: true,
              type: "number",
              inputMode: "decimal",
              min: 0,
              step: 0.25,
            },
          ],
        },
      ],
    },
  ];
  const handleFieldChange = (name: keyof typeof formValues, value: string) =>
    setForm((prev) => ({ ...prev, [name]: value }));
  const confirmDeleteDisabled = typedName !== shopName || deleteShop.isPending || !shopName;
  const openDelete = () => {
    setTypedName("");
    setDeleteMessage(null);
    setDeleteOpen(true);
  };
  const closeDelete = () => {
    if (deleteShop.isPending) return;
    setDeleteOpen(false);
    setTypedName("");
    setDeleteMessage(null);
  };
  const confirmDelete = async () => {
    if (confirmDeleteDisabled) return;
    try {
      await deleteShop.mutateAsync(typedName);
      setDeleteOpen(false);
      setTypedName("");
      setDeleteMessage(null);
    } catch (cause) {
      setDeleteMessage(cause instanceof Error ? cause.message : "Could not delete this shop.");
    }
  };
  return {
    fields,
    formValues,
    handleFieldChange,
    errorMessage,
    updateShopPending: updateShop.isPending,
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
    deletePending: deleteShop.isPending,
    openDelete,
    closeDelete,
    confirmDelete,
  };
}
export type ShopTabModel = ReturnType<typeof useShopTab>;
