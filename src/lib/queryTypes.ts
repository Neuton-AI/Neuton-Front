import type { AuthIdentity } from "./api-context";
export type AuthenticatedContext = AuthIdentity | null | undefined;
export type ShopId = string | null | undefined;

export const enabled = (
  identity: AuthenticatedContext,
  shopId: ShopId,
): boolean => Boolean(identity && shopId);
