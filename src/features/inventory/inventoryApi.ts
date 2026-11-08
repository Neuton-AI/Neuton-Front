import { inventoryKeys } from '@/features/inventory/keys';
import { type InventoryItem } from '@/features/inventory/types';
import { apiFetch } from '@/lib/api';
import type { ShopId, UserId } from '@/lib/queryTypes';
import { enabled } from '@/lib/queryTypes';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export function useInventory(
  userId: UserId,
  shopId: ShopId,
  active = true,
): UseQueryResult<{ items: InventoryItem[] }> {
  return useQuery({
    queryKey: inventoryKeys.inventory(shopId),
    queryFn: ({ signal }) =>
      apiFetch<{ items: InventoryItem[] }>('/inventory', { userId, shopId, signal }),
    enabled: enabled(userId, shopId) && active,
  });
}
