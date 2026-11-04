import { shopsKeys } from '@/features/shops/keys';
import { type Shop } from '@/features/shops/types';
import { apiFetch } from '@/lib/api';
import type { ShopId, AuthenticatedContext } from '@/lib/queryTypes';
import { networkEnabled } from '@/lib/queryTypes';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

export function useShopSettings(
  identity: AuthenticatedContext,
  shopId: ShopId,
): UseQueryResult<{ shop: Shop }> {
  return useQuery({
    networkMode: 'always',
    queryKey: shopsKeys.shop(identity, shopId),
    queryFn: ({ signal }) =>
      apiFetch<{ shop: Shop }>('/shop', { identity, shopId, signal }),
    enabled: networkEnabled(identity, shopId),
  });
}

export type UpdateShopBody = {
  storeAddress: string | null;
  targetProfitMargin: number;
  hourlyLaborCost: number;
  deliveryBaseFee: number;
  deliveryRatePerKm: number;
};

export function useUpdateShop(
  identity: AuthenticatedContext,
  shopId: ShopId,
): UseMutationResult<{ shop: Shop }, Error, UpdateShopBody> {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: (body: UpdateShopBody) =>
      apiFetch<{ shop: Shop }>('/shop', {
        method: 'PATCH',
        identity,
        shopId,
        body,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(shopsKeys.shop(identity, shopId), data);
    },
  });
}

export function useCreateShop(
  identity: AuthenticatedContext,
): UseMutationResult<{ shop: Shop }, Error, string> {
  return useMutation({
    networkMode: 'always',
    mutationFn: (name: string) =>
      apiFetch<{ shop: Shop }>('/shops', {
        method: 'POST',
        identity,
        body: { name },
      }),
  });
}
