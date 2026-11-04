import { inventoryKeys } from '@/features/inventory/keys';
import { type InventoryItem } from '@/features/inventory/types';
import { apiFetch } from '@/lib/api';
import type { ShopId, AuthenticatedContext } from '@/lib/queryTypes';
import { networkEnabled } from '@/lib/queryTypes';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export function useInventory(
  identity: AuthenticatedContext,
  shopId: ShopId,
  active = true,
): UseQueryResult<{ items: InventoryItem[] }> {
  return useQuery({
    networkMode: 'always',
    queryKey: inventoryKeys.inventory(identity, shopId),
    queryFn: ({ signal }) =>
      apiFetch<{ items: InventoryItem[] }>('/inventory', {
        identity,
        shopId,
        signal,
      }),
    enabled: networkEnabled(identity, shopId) && active,
  });
}
