import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { scopeFor } from "./types";
import * as store from "./store";
import {
  identityQueryKey,
  sameQueryPartition,
} from "@/features/auth/environment";

it("uses a separate identity namespace while retaining the same partition across session replacement", async () => {
  const identity = {
    environment: "test:one",
    userId: "user-one",
    sessionId: "session-one",
  };
  const first = scopeFor(identity, "shop");
  expect(first.key).toMatch(/^neuton-owned-v1:/);
  expect(scopeFor({ ...identity, sessionId: "session-two" }, "shop").key).toBe(
    first.key,
  );
  expect(
    scopeFor({ ...identity, environment: "test:two" }, "shop").key,
  ).not.toBe(first.key);
  expect(scopeFor({ ...identity, userId: "user-two" }, "shop").key).not.toBe(
    first.key,
  );
  expect((await store.database()).name).not.toBe("neuton-documents-v1");
});

it("partitions cached documents and placeholders by environment, user and shop, while preserving same-owner filter changes", () => {
  const identity = {
    environment: "test:one",
    userId: "user-one",
    sessionId: "one",
  };
  const key = identityQueryKey(identity, "dashboard", "shop", "7d");
  expect(
    sameQueryPartition(key, { ...identity, sessionId: "two" }, "shop"),
  ).toBe(true);
  expect(
    sameQueryPartition(key, { ...identity, userId: "someone-else" }, "shop"),
  ).toBe(false);
  expect(
    sameQueryPartition(key, { ...identity, environment: "other" }, "shop"),
  ).toBe(false);
  expect(sameQueryPartition(key, identity, "other-shop")).toBe(false);
  expect(sameQueryPartition(key, null, "shop")).toBe(false);
});
