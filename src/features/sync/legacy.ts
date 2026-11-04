export const LEGACY_DOCUMENT_DATABASE = "neuton-documents-v1";
const legacyKey = (key: string) =>
  key === "neuton.activeShopId" ||
  key.startsWith("neuton.memberships:") ||
  key.startsWith("neuton.activeShop:");

function legacyPreferenceKeys(): string[] {
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key && legacyKey(key)) keys.push(key);
  }
  return keys;
}

/** Only inspect existence, never the former account's documents or credentials. */
export async function hasLegacyData(): Promise<boolean> {
  try {
    if (legacyPreferenceKeys().length) return true;
  } catch {
    /* Storage may be unavailable. */
  }
  if (typeof indexedDB === "undefined") return false;
  if (typeof indexedDB.databases === "function") {
    return (await indexedDB.databases()).some(
      (row) => row.name === LEGACY_DOCUMENT_DATABASE,
    );
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DOCUMENT_DATABASE);
    request.onupgradeneeded = (event) => {
      if (event.oldVersion === 0) {
        request.transaction!.abort();
        resolve(false);
      }
    };
    request.onsuccess = () => {
      request.result.close();
      resolve(true);
    };
    request.onerror = () => {
      if (request.error?.name === "AbortError") resolve(false);
      else {
        reject(request.error);
      }
    };
    request.onblocked = () =>
      reject(new Error("Close older Neuton tabs to inspect saved data."));
  });
}

/** Called only after an explicit destructive choice; the active database is untouched. */
export async function discardLegacyData(): Promise<void> {
  if (typeof indexedDB !== "undefined") {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(LEGACY_DOCUMENT_DATABASE);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(
          new Error("Close older Neuton tabs to finish discarding saved data."),
        );
    });
  }
  for (const key of legacyPreferenceKeys()) localStorage.removeItem(key);
}
