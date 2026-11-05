import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  action: { ticket: "A".repeat(43), error: null as string | null },
  clear: vi.fn(),
}));
vi.mock("@/lib/api", () => ({
  apiFetch: mocks.api,
  ApiError: class extends Error {},
}));
vi.mock("./action-fragment", () => ({
  readGoogleAction: () => mocks.action,
  clearGoogleAction: mocks.clear,
}));
beforeEach(() => {
  vi.resetModules();
  mocks.api.mockReset();
  mocks.action = { ticket: "A".repeat(43), error: null };
});
it("shares a one-use completion POST across remounts and removes its captured secret", async () => {
  mocks.api.mockResolvedValue({ purpose: "login", returnPath: "/dashboard" });
  const { completeCapturedGoogle } = await import("./google-completion");
  await Promise.all([completeCapturedGoogle(), completeCapturedGoogle()]);
  expect(mocks.api).toHaveBeenCalledOnce();
  expect(mocks.api).toHaveBeenCalledWith("/auth/google/complete", {
    method: "POST",
    body: { ticket: "A".repeat(43) },
  });
  expect(mocks.clear).toHaveBeenCalled();
});
it("rejects cancelled flows without a completion POST", async () => {
  mocks.action.error = "GOOGLE_AUTH_FAILED";
  const { completeCapturedGoogle } = await import("./google-completion");
  await expect(completeCapturedGoogle()).rejects.toThrow(
    "cancelled or expired",
  );
  expect(mocks.api).not.toHaveBeenCalled();
});
it("accepts only the fixed Google authorization host and path", async () => {
  const { authClient } = await import("./client");
  mocks.api.mockResolvedValueOnce({
    authorizationUrl: "https://attacker.example/auth",
  });
  await expect(authClient.startGoogle("login")).rejects.toThrow(
    "could not start",
  );
  mocks.api.mockResolvedValueOnce({
    authorizationUrl:
      "https://accounts.google.com/o/oauth2/v2/auth?state=synthetic",
  });
  await expect(authClient.startGoogle("login")).resolves.toContain(
    "https://accounts.google.com/",
  );
});
