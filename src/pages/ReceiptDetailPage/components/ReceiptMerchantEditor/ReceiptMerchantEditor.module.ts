import { useEffect, useRef, useState, type FormEvent } from "react";
import { useUpdateReceiptMerchant } from "@/features/receipts/receiptsApi";
import type { Receipt } from "@/features/receipts/types";
import type { ShopId, UserId } from "@/lib/queryTypes";

export type MerchantEditorProps = {
  receipt: Receipt;
  userId: UserId;
  shopId: ShopId;
};
export function useReceiptMerchantEditor({
  receipt,
  userId,
  shopId,
}: MerchantEditorProps) {
  const [name, setName] = useState(receipt.merchantName?.trim() ?? "");
  const base = useRef({
    id: receipt.id,
    name: receipt.merchantName?.trim() ?? "",
  });
  const [conflict, setConflict] = useState(false);
  useEffect(() => {
    const incoming = receipt.merchantName?.trim() ?? "";
    const previous = base.current;
    if (previous.id !== receipt.id || name === previous.name) {
      setName(incoming);
      setConflict(false);
    } else if (incoming !== previous.name && incoming !== name)
      setConflict(true);
    base.current = { id: receipt.id, name: incoming };
  }, [receipt.id, receipt.merchantName, name]);
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateReceiptMerchant(userId, shopId);
  const trimmed = name.trim();
  const valid = trimmed.length > 0 && trimmed.length <= 200;
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!valid || update.isPending || conflict) return;
    setError(null);
    try {
      await update.mutateAsync({ id: receipt.id, merchantName: trimmed });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save merchant.",
      );
    }
  }
  return {
    conflict,
    resolveConflict: (choice: "local" | "server") => {
      if (choice === "server") setName(base.current.name);
      setConflict(false);
    },
    name,
    setName,
    error,
    save,
    pending: update.isPending,
    disabled:
      !valid ||
      trimmed === receipt.merchantName?.trim() ||
      update.isPending ||
      conflict,
  };
}
