import { afterEach, expect, it } from "vitest";
import { beginApiRequest, setApiIdentity } from "./api-context";
afterEach(() => setApiIdentity(null));
it("aborts in-flight requests and rejects a stale identity before it can send", () => {
  const alice = { environment: "test", userId: "alice" };
  setApiIdentity(alice);
  const request = beginApiRequest(alice);
  request.assertCurrent();
  setApiIdentity({ environment: "test", userId: "bob" });
  expect(request.signal.aborted).toBe(true);
  expect(request.assertCurrent).toThrow(/Account context changed/);
  const stale = beginApiRequest(alice);
  expect(stale.assertCurrent).toThrow(/Account context changed/);
  request.dispose();
  stale.dispose();
});
it("combines caller cancellation with identity cancellation", () => {
  const controller = new AbortController();
  const request = beginApiRequest(undefined, controller.signal);
  controller.abort();
  expect(request.signal.aborted).toBe(true);
  expect(request.assertCurrent).toThrow();
  request.dispose();
});
it("rejects an explicitly unauthenticated business context even when another cookie may exist", () => {
  setApiIdentity({ environment: "test", userId: "bob" });
  const request = beginApiRequest(null);
  expect(request.assertCurrent).toThrow(/Account context changed/);
  request.dispose();
});
