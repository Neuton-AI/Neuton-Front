import type { ShopId } from '@/lib/queryTypes';
export const receiptsKeys = {
  receipts: (shopId: ShopId) => ['receipts', shopId] as const,
  receipt: (shopId: ShopId, id: string) => ['receipt', shopId, id] as const,
};
