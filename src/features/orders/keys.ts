import type { StatusFilter } from '@/features/orders/types';
import type { ShopId } from '@/lib/queryTypes';
export const ordersKeys = {
  orders: (shopId: ShopId, status: StatusFilter) => ['orders', shopId, status] as const,
  ordersRoot: ['orders'] as const,
  order: (shopId: ShopId, id: string) => ['order', shopId, id] as const,
};
