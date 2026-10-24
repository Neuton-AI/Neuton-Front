import { useState, type FormEvent } from 'react';
import { useUpdateReceiptMerchant } from '@/features/receipts/receiptsApi';
import type { Receipt } from '@/features/receipts/types';
import type { ShopId, Token } from '@/lib/queryTypes';

export type MerchantEditorProps = {
  receipt: Receipt;
  token: Token;
  shopId: ShopId;
};
export function useReceiptMerchantEditor({ receipt, token, shopId }: MerchantEditorProps) {
  const [name, setName] = useState(receipt.merchantName?.trim() ?? '');
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateReceiptMerchant(token, shopId);
  const trimmed = name.trim();
  const valid = trimmed.length > 0 && trimmed.length <= 200;
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!valid || update.isPending) return;
    setError(null);
    try {
      await update.mutateAsync({ id: receipt.id, merchantName: trimmed });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save merchant.');
    }
  }
  return {
    name,
    setName,
    error,
    save,
    pending: update.isPending,
    disabled: !valid || trimmed === receipt.merchantName?.trim() || update.isPending,
  };
}
