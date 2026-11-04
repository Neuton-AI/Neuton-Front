import { renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { setApiIdentity } from "@/lib/api-context";
import { useCurrentOperation } from "./useCurrentOperation";

afterEach(() => setApiIdentity(null));
it("rejects callbacks retained by an old page generation and by an unmounted page", () => {
  const identity = {
    environment: "test",
    userId: "user",
    sessionId: "session",
    generation: 1,
    shopId: "shop",
  };
  setApiIdentity(identity);
  const { result, rerender, unmount } = renderHook(
    ({ identity }) => useCurrentOperation(identity, "shop"),
    { initialProps: { identity } },
  );
  const oldCallback = result.current;
  expect(oldCallback()).toBe(true);
  const renewed = { ...identity, generation: 2 };
  setApiIdentity(renewed);
  rerender({ identity: renewed });
  expect(oldCallback()).toBe(false);
  const newCallback = result.current;
  expect(newCallback()).toBe(true);
  unmount();
  expect(newCallback()).toBe(false);
});
