export type { AuthIdentity } from "@/lib/api-context";
export interface ShopSummary {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  storeAddress: string | null;
  targetProfitMargin: string;
  hourlyLaborCost: string;
  deliveryBaseFee: string;
  deliveryRatePerKm: string;
}
export interface ShopMembershipDto {
  shopId: string;
  role: "owner" | "admin" | "member";
  shop: ShopSummary;
}
export interface SessionDto {
  environment: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    status: "pending_email" | "active";
    emailConfirmedAt: string | null;
  };
  session: {
    id: string;
    idleExpiresAt: string;
    absoluteExpiresAt: string;
    recentAuthenticationExpiresAt: string | null;
    renewAfter: string;
  };
  memberships: ShopMembershipDto[];
}
export interface DeviceSession {
  id: string;
  createdAt: string;
  lastActivityAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  device: string | null;
  current: boolean;
}
export type AuthStatus =
  | "loading"
  | "anonymous"
  | "pending-email"
  | "authenticated"
  | "offline"
  | "unavailable";
