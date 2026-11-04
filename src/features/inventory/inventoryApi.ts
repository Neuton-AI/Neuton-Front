import { inventoryKeys } from '@/features/inventory/keys';
import { type InventoryItem } from '@/features/inventory/types';
import { apiFetch } from '@/lib/api';
import type { ShopId, AuthenticatedContext } from '@/lib/queryTypes';
import { enabled } from '@/lib/queryTypes';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export function useInventory(
  identity: AuthenticatedContext,
  shopId: ShopId,
  active = true,
): UseQueryResult<{ items: InventoryItem[] }> {
  return useQuery({
    queryKey: inventoryKeys.inventory(shopId),
    queryFn: ({ signal }) =>
      apiFetch<{ items: InventoryItem[] }>('/inventory', {
        identity,
        shopId,
        signal,
      }),
    enabled: enabled(identity, shopId) && active,
  });
}
