import "fake-indexeddb/auto";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LegacyDataNotice } from "./LegacyDataNotice";
import {
  discardLegacyData,
  hasLegacyData,
  LEGACY_DOCUMENT_DATABASE,
} from "./legacy";
import { database, result, transaction } from "./store";

afterEach(async () => {
  await discardLegacyData();
  localStorage.clear();
});

it("quarantines legacy records without reading or adopting their contents, then discards only after confirmation", async () => {
  const old = await new Promise<IDBDatabase>((resolve) => {
    const request = indexedDB.open(LEGACY_DOCUMENT_DATABASE);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("documents");
    request.onsuccess = () => resolve(request.result);
  });
  const write = old.transaction("documents", "readwrite");
  write
    .objectStore("documents")
    .put({ private: "Former account draft" }, "old");
  await new Promise<void>((resolve) => {
    write.oncomplete = () => resolve();
  });
  old.close();
  localStorage.setItem("neuton.memberships:old-user", "former memberships");
  localStorage.setItem(
    "neuton-owned-v1:test:new-user:activeShop",
    "current-shop",
  );
  await transaction(["settings"], (tx) =>
    tx.objectStore("settings").put({ key: "current", scope: "current" }),
  );
  const readOld = vi.spyOn(IDBObjectStore.prototype, "getAll");
  render(<LegacyDataNotice />);
  expect(
    await screen.findByRole("complementary", { name: "Previous offline data" }),
  ).toBeVisible();
  expect(screen.queryByText("Former account draft")).toBeNull();
  expect(readOld).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Discard old saved data" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(await hasLegacyData()).toBe(true);
  fireEvent.click(
    screen.getByRole("button", { name: "Discard old saved data" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Discard old data" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("complementary", { name: "Previous offline data" }),
    ).toBeNull(),
  );
  expect(await hasLegacyData()).toBe(false);
  expect(localStorage.getItem("neuton-owned-v1:test:new-user:activeShop")).toBe(
    "current-shop",
  );
  expect(
    await result(
      (await database())
        .transaction("settings")
        .objectStore("settings")
        .get("current"),
    ),
  ).toEqual({ key: "current", scope: "current" });
});
