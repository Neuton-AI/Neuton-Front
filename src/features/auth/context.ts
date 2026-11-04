import { createContext } from "react";
import type { AuthIdentity, AuthStatus, SessionDto } from "./types";
export interface AuthContextValue {
  status: AuthStatus;
  session: SessionDto | null;
  user: SessionDto["user"] | null;
  identity: AuthIdentity | null;
  loading: boolean;
  error: string | null;
  lastUserId: string | null;
  activeShopId: string | null;
  refresh(): Promise<SessionDto | null>;
  login(email: string, password: string): Promise<SessionDto | null>;
  register(email: string, password: string, fullName?: string): Promise<void>;
  logout(): Promise<void>;
  setActiveShopId(shopId: string): void;
}
export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
