import { expect, it, vi } from "vitest";
it("removes a confirmation fragment during module evaluation without storage or automatic consumption", async () => {
  vi.resetModules();
  const secret = "A".repeat(43);
  history.replaceState(null, "", "/auth/confirm#token=" + secret);
  const beforeLocal = localStorage.length;
  const beforeSession = sessionStorage.length;
  const action = await import("./action-fragment");
  expect(location.hash).toBe("");
  expect(action.readActionSecret()).toBe(secret);
  expect(localStorage.length).toBe(beforeLocal);
  expect(sessionStorage.length).toBe(beforeSession);
  action.clearActionSecret();
  expect(action.readActionSecret()).toBeNull();
});
it("strips malformed action fragments without accepting them as secrets", async () => {
  vi.resetModules();
  history.replaceState(null, "", "/auth/confirm#token=invalid");
  const action = await import("./action-fragment");
  expect(location.hash).toBe("");
  expect(action.readActionSecret()).toBeNull();
});
it("captures Google completion tickets before telemetry without persisting them", async () => {
  vi.resetModules();
  history.replaceState(
    null,
    "",
    "/auth/google/complete#ticket=" + "A".repeat(43),
  );
  const action = await import("./action-fragment");
  expect(location.hash).toBe("");
  expect(action.readGoogleAction()).toEqual({
    ticket: "A".repeat(43),
    error: null,
  });
  expect(action.readActionSecret()).toBeNull();
  action.clearGoogleAction();
  expect(action.readGoogleAction()).toEqual({ ticket: null, error: null });
});
it("captures only allowlisted Google errors and strips all fragments", async () => {
  vi.resetModules();
  history.replaceState(
    null,
    "",
    "/auth/google/complete#error=GOOGLE_EMAIL_COLLISION",
  );
  const action = await import("./action-fragment");
  expect(location.hash).toBe("");
  expect(action.readGoogleAction()).toEqual({
    ticket: null,
    error: "GOOGLE_EMAIL_COLLISION",
  });
});
