export type UserId = string | null | undefined;
export type ShopId = string | null | undefined;

export const enabled = (userId: UserId, shopId: ShopId): boolean => Boolean(userId && shopId);
