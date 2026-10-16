export type Token = string | null | undefined;
export type ShopId = string | null | undefined;

export const enabled = (token: Token, shopId: ShopId): boolean => Boolean(token && shopId);
