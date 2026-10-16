import { inventoryKeys } from '@/features/inventory/keys';
import { type InventoryItem } from '@/features/inventory/types';
import { apiFetch } from '@/lib/api';
import type { ShopId, Token } from '@/lib/queryTypes';
import { enabled } from '@/lib/queryTypes';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export function useInventory(
  token: Token,
  shopId: ShopId,
  active = true,
): UseQueryResult<{ items: InventoryItem[] }> {
  return useQuery({
    queryKey: inventoryKeys.inventory(shopId),
    queryFn: ({ signal }) =>
      apiFetch<{ items: InventoryItem[] }>('/inventory', { token, shopId, signal }),
    enabled: enabled(token, shopId) && active,
  });
}
