import { apiFetch, ApiError } from "@/lib/api";
import { resetCsrf } from "./csrf";
import type { AuthIdentity, DeviceSession, SessionDto } from "./types";

export const authClient = {
  async session(signal?: AbortSignal): Promise<SessionDto> {
    const session = await apiFetch<SessionDto>("/session", { signal });
    if (
      !session?.user?.id ||
      !session.environment ||
      !Array.isArray(session.memberships) ||
      !["active", "pending_email"].includes(session.user.status) ||
      (session.user.status === "active" && !session.user.emailConfirmedAt)
    ) {
      throw new ApiError("Invalid session response", 502);
    }
    return session;
  },
  async login(email: string, password: string): Promise<void> {
    await apiFetch("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    resetCsrf();
  },
  register(email: string, password: string, fullName?: string): Promise<void> {
    return apiFetch("/auth/register", {
      method: "POST",
      body: { email, password, ...(fullName ? { fullName } : {}) },
    });
  },
  confirm(token: string): Promise<void> {
    return apiFetch("/auth/email/confirm", { method: "POST", body: { token } });
  },
  resend(email: string): Promise<void> {
    return apiFetch("/auth/email/resend", { method: "POST", body: { email } });
  },
  recover(email: string): Promise<void> {
    return apiFetch("/auth/password/recovery", {
      method: "POST",
      body: { email },
    });
  },
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiFetch("/auth/password/reset", {
      method: "POST",
      body: { token, newPassword },
    });
    resetCsrf();
  },
  renew(identity: AuthIdentity): Promise<void> {
    return apiFetch("/auth/session/renew", {
      method: "POST",
      body: {},
      identity,
    });
  },
  changePassword(
    identity: AuthIdentity,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    return apiFetch("/profile/password", {
      method: "POST",
      body: { currentPassword, newPassword },
      identity,
    });
  },
  reauthenticate(
    identity: AuthIdentity,
    currentPassword: string,
  ): Promise<void> {
    return apiFetch("/auth/reauthenticate/password", {
      method: "POST",
      body: { currentPassword },
      identity,
    });
  },
  devices(
    identity: AuthIdentity,
    signal?: AbortSignal,
  ): Promise<{ sessions: DeviceSession[] }> {
    return apiFetch("/auth/sessions", { identity, signal });
  },
  revokeDevice(id: string, identity: AuthIdentity): Promise<void> {
    return apiFetch(`/auth/sessions/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: {},
      identity,
    });
  },
  async logoutAll(expectedUserId?: string): Promise<void> {
    await apiFetch("/auth/logout-all", {
      method: "POST",
      body: {},
      expectedUserId,
    });
    resetCsrf();
  },
  async logout(expectedUserId?: string): Promise<void> {
    await apiFetch("/auth/logout", {
      method: "POST",
      body: {},
      expectedUserId,
    });
    resetCsrf();
  },
};
const safePaths =
  /^(?:\/|\/(?:dashboard|profile|catalog|capture|orders)|\/orders\/(?:new|[A-Za-z0-9_-]+)|\/catalog\/(?:recipes|receipts)\/[A-Za-z0-9_-]+)$/;
export function safeReturnPath(path: unknown): string {
  return typeof path === "string" && safePaths.test(path) ? path : "/dashboard";
}
