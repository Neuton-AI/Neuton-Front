import type { LocalDocument, PendingScan, PendingWrite } from './types';

const DATABASE = 'neuton-documents-v1';
const STORES = [
  'documents',
  'writes',
  'pulls',
  'scans',
  'blobs',
  'settings',
] as const;
type StoreName = (typeof STORES)[number];
let opening: Promise<IDBDatabase> | undefined;
const events = new EventTarget();
const channel =
  typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel(DATABASE)
    : null;
channel?.addEventListener('message', () =>
  events.dispatchEvent(new Event('change')),
);
export function subscribe(listener: () => void) {
  events.addEventListener('change', listener);
  return () => events.removeEventListener('change', listener);
}
export function changed() {
  events.dispatchEvent(new Event('change'));
  channel?.postMessage('change');
}
export function database() {
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 2);
    request.onupgradeneeded = () => {
      for (const name of STORES) {
        if (request.result.objectStoreNames.contains(name)) continue;
        const store = request.result.createObjectStore(name, {
          keyPath: 'key',
        });
        store.createIndex('scope', 'scope');
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        opening = undefined;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      opening = undefined;
      reject(request.error);
    };
    request.onblocked = () =>
      reject(new Error('Close other Neuton tabs and retry local storage.'));
  });
  return opening;
}
export function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
/** Schedule requests inside this callback; await only IndexedDB requests to keep the transaction alive. */
export async function transaction<T>(
  names: StoreName[],
  write: (tx: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  const db = await database();
  const tx = db.transaction(names, 'readwrite');
  const completed = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () =>
      reject(tx.error ?? new Error('Local storage transaction failed.'));
  });
  try {
    const value = await write(tx);
    await completed;
    return value;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* Already aborted or committed. */
    }
    await completed.catch(() => undefined);
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new Error(
        'Device storage is full. Export pending work from the sync banner, free device space, then retry. Your new change was not saved.',
      );
    }
    throw error;
  }
}
export async function rows<T>(name: StoreName, scope: string): Promise<T[]> {
  const db = await database();
  return result(
    db.transaction(name).objectStore(name).index('scope').getAll(scope),
  ) as Promise<T[]>;
}
export async function get<T>(
  name: StoreName,
  key: string,
): Promise<T | undefined> {
  const db = await database();
  return result(db.transaction(name).objectStore(name).get(key)) as Promise<
    T | undefined
  >;
}
export const documents = (scope: string) =>
  rows<LocalDocument>('documents', scope);
export const writes = (scope: string) => rows<PendingWrite>('writes', scope);
export const scans = (scope: string) => rows<PendingScan>('scans', scope);

/** Retain private pending work for the same account; drop synced records on explicit sign-out. */
export async function logoutCleanup(userId: string) {
  await transaction(['documents', 'settings'], async (tx) => {
    for (const name of ['documents', 'settings'] as const) {
      const store = tx.objectStore(name);
      const values = (await result(store.getAll())) as (LocalDocument & {
        scope: string;
      })[];
      for (const value of values) {
        if (
          value.scope.startsWith(`${userId}:`) &&
          (name === 'settings' || value.syncStatus === 'synced')
        )
          store.delete(value.key);
      }
    }
  });
}
