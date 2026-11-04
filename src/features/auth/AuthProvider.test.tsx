import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-error";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./useAuth";
import { authClient } from "./client";
import type { SessionDto } from "./types";

vi.mock("./client", () => ({
  authClient: {
    session: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    renew: vi.fn(),
  },
}));
const session = (userId = "user-a"): SessionDto => ({
  environment: "test:synthetic",
  user: {
    id: userId,
    email: userId + "@example.com",
    fullName: null,
    avatarUrl: null,
    status: "active",
    emailConfirmedAt: new Date().toISOString(),
  },
  memberships: [],
  session: {
    id: "session-a",
    idleExpiresAt: "2099-01-01T00:00:00Z",
    absoluteExpiresAt: "2099-01-02T00:00:00Z",
    recentAuthenticationExpiresAt: null,
    renewAfter: "2099-01-01T00:00:00Z",
  },
});
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
});
function fixture() {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  return { ...renderHook(useAuth, { wrapper }), client };
}
it("keeps an authentication outage separate from an anonymous response", async () => {
  vi.mocked(authClient.session).mockRejectedValueOnce(
    new ApiError("Unavailable", 503),
  );
  const { result } = fixture();
  await waitFor(() => expect(result.current.status).toBe("unavailable"));
  expect(result.current.user).toBeNull();
});
it("clears account caches before exposing another account and does not confirm failed logout", async () => {
  vi.mocked(authClient.session)
    .mockResolvedValueOnce(session())
    .mockResolvedValueOnce(session("user-b"));
  const { result, client } = fixture();
  await waitFor(() => expect(result.current.user?.id).toBe("user-a"));
  client.setQueryData(["old-private-document"], { private: true });
  await act(() => result.current.refresh());
  expect(result.current.user?.id).toBe("user-b");
  expect(client.getQueryData(["old-private-document"])).toBeUndefined();
  vi.mocked(authClient.logout).mockRejectedValue(
    new ApiError("Unavailable", 503),
  );
  await act(async () => {
    await expect(result.current.logout()).rejects.toThrow();
  });
  expect(result.current.status).toBe("unavailable");
  expect(result.current.error).toMatch(/not.*confirmed/i);
});

it("retains only an already established identity during a connection outage and locks on confirmed expiry", async () => {
  vi.mocked(authClient.session).mockResolvedValueOnce(session());
  const { result } = fixture();
  await waitFor(() => expect(result.current.status).toBe("authenticated"));
  const first = result.current.identity;
  vi.mocked(authClient.session).mockRejectedValueOnce(
    new ApiError("Offline", 0),
  );
  await act(() => result.current.refresh());
  expect(result.current.status).toBe("offline");
  expect(result.current.identity).toMatchObject({
    userId: first!.userId,
    offline: true,
  });
  vi.mocked(authClient.session).mockRejectedValueOnce(
    new ApiError("Expired", 401),
  );
  await act(() => result.current.refresh());
  expect(result.current.status).toBe("anonymous");
  expect(result.current.identity).toBeNull();
});

it("invalidates old request authority on same-user session replacement without changing persisted identity", async () => {
  const { beginApiRequest } = await import("@/lib/api-context");
  const { scopeFor } = await import("@/features/sync/types");
  vi.mocked(authClient.session).mockResolvedValueOnce(session());
  const { result, client } = fixture();
  await waitFor(() => expect(result.current.status).toBe("authenticated"));
  const old = result.current.identity!;
  const request = beginApiRequest(old);
  client.setQueryData(["same-account"], "retained");
  const replacement = session();
  replacement.session.id = "replacement";
  vi.mocked(authClient.session).mockResolvedValueOnce(replacement);
  await act(() => result.current.refresh());
  expect(request.signal.aborted).toBe(true);
  expect(() => request.assertCurrent()).toThrow();
  expect(result.current.identity?.generation).not.toBe(old.generation);
  expect(scopeFor(result.current.identity, "shop").key).toBe(
    scopeFor(old, "shop").key,
  );
  expect(client.getQueryData(["same-account"])).toBe("retained");
  request.dispose();
});
