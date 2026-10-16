import { shopsKeys } from '@/features/shops/keys';
import { type Shop } from '@/features/shops/types';
import { apiFetch } from '@/lib/api';
import type { ShopId, Token } from '@/lib/queryTypes';
import { enabled } from '@/lib/queryTypes';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

export function useShopSettings(token: Token, shopId: ShopId): UseQueryResult<{ shop: Shop }> {
  return useQuery({
    queryKey: shopsKeys.shop(shopId),
    queryFn: ({ signal }) => apiFetch<{ shop: Shop }>('/shop', { token, shopId, signal }),
    enabled: enabled(token, shopId),
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
  token: Token,
  shopId: ShopId,
): UseMutationResult<{ shop: Shop }, Error, UpdateShopBody> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateShopBody) =>
      apiFetch<{ shop: Shop }>('/shop', { method: 'PATCH', token, shopId, body }),
    onSuccess: (data) => {
      queryClient.setQueryData(shopsKeys.shop(shopId), data);
    },
  });
}

export function useCreateShop(token: Token): UseMutationResult<{ shop: Shop }, Error, string> {
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<{ shop: Shop }>('/shops', { method: 'POST', token, body: { name } }),
  });
}
