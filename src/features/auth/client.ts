import { apiFetch, ApiError } from "@/lib/api";
import { resetCsrf } from "./csrf";
import type {
  AuthIdentity,
  DeviceSession,
  SessionDto,
  LoginMethods,
} from "./types";

export const authClient = {
  methods(identity: AuthIdentity, signal?: AbortSignal): Promise<LoginMethods> {
    return apiFetch("/auth/methods", { identity, signal });
  },
  addPassword(identity: AuthIdentity, newPassword: string): Promise<void> {
    return apiFetch("/auth/password/add", {
      method: "POST",
      body: { newPassword },
      identity,
    });
  },
  unlinkGoogle(identity: AuthIdentity): Promise<void> {
    return apiFetch("/auth/methods/google", {
      method: "DELETE",
      body: {},
      identity,
    });
  },
  async startGoogle(
    purpose: "login" | "link" | "reauthenticate",
    returnPath = "/",
    identity?: AuthIdentity,
  ): Promise<string> {
    const result = await apiFetch<{ authorizationUrl: string }>(
      "/auth/google/start",
      { method: "POST", body: { purpose, returnPath }, identity },
    );
    const url = new URL(result.authorizationUrl);
    if (
      url.origin !== "https://accounts.google.com" ||
      url.pathname !== "/o/oauth2/v2/auth" ||
      url.username ||
      url.password
    ) {
      throw new Error("Google sign-in could not start. Please try again.");
    }
    return url.href;
  },
  async completeGoogle(ticket: string): Promise<{
    returnPath: string;
    purpose: "login" | "link" | "reauthenticate";
  }> {
    const result = await apiFetch<{
      returnPath: string;
      purpose: "login" | "link" | "reauthenticate";
    }>("/auth/google/complete", { method: "POST", body: { ticket } });
    resetCsrf();
    return result;
  },
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
