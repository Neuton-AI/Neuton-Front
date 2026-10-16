import type { ShopId } from '@/lib/queryTypes';
export const shopsKeys = {
  shop: (shopId: ShopId) => ['shop', shopId] as const,
};
