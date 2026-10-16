import type { ShopId } from '@/lib/queryTypes';
export const inventoryKeys = {
  inventory: (shopId: ShopId) => ['inventory', shopId] as const,
};
