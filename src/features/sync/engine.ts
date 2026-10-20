import { apiFetch, ApiError, type RequestOptions } from '@/lib/api';
import {
  uploadSources,
  type UploadSession,
} from '@/features/uploads/uploadSources';
import * as store from './store';
import {
  documentKey,
  type Kind,
  type LocalDocument,
  type PendingPull,
  type PendingScan,
  type Scope,
} from './types';

type Meta = { kind: Kind; id: string; updatedAt: number; deleted?: boolean };
type Comparison = { toPush: Meta[]; toPull: Meta[] };
const plural = { receipt: 'receipts', recipe: 'recipes', order: 'orders' };
const running = new Map<string, Promise<void>>();
export const syncErrors = new Map<string, string>();

export function syncDocuments(
  scope: Scope,
  context: RequestOptions,
): Promise<void> {
  if (!navigator.onLine) return Promise.resolve();
  const previous = running.get(scope.key);
  if (previous) return previous;
  const run = synchronize(scope, { ...context, signal: undefined })
    .then(() => {
      if (syncErrors.delete(scope.key)) store.changed();
    })
    .catch((error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Sync failed. Retry when connected.';
      if (syncErrors.get(scope.key) !== message) {
        syncErrors.set(scope.key, message);
        store.changed();
      }
      throw error;
    })
    .finally(() => running.delete(scope.key));
  running.set(scope.key, run);
  return run;
}

async function synchronize(scope: Scope, context: RequestOptions) {
  if (!navigator.onLine) return;
  // Web Locks serialize tabs as well as in-process runs. Server retry receipts also protect older browsers.
  const perform = () => transfer(scope, context);
  if (navigator.locks)
    await navigator.locks.request(`neuton-sync:${scope.key}`, perform);
  else await perform();
}

async function transfer(scope: Scope, context: RequestOptions) {
  const failures: unknown[] = [];
  for (const scan of await store.scans(scope.key)) {
    try {
      await pushScan(scope, context, scan);
    } catch (error) {
      failures.push(error);
    }
  }
  let comparedVersions = new Map<string, number>();
  const compare = async () => {
    const local = await store.documents(scope.key);
    comparedVersions = new Map(local.map((row) => [row.key, row.updatedAt]));
    return apiFetch<Comparison>('/sync/check', {
      ...context,
      method: 'POST',
      body: {
        documents: local
          .filter((row) => !row.localOnly)
          .map(({ kind, id, updatedAt, deleted }) => ({
            kind,
            id,
            updatedAt,
            deleted,
          })),
      },
    });
  };
  const comparison = await compare();
  const pushKeys = new Set(
    comparison.toPush.map((meta) => documentKey(scope, meta.kind, meta.id)),
  );
  const pullKeys = new Set(
    comparison.toPull.map((meta) => documentKey(scope, meta.kind, meta.id)),
  );
  const pending = (await store.writes(scope.key)).sort(
    (a, b) => a.updatedAt - b.updatedAt,
  );
  let acknowledged = false;
  const failedDocuments = new Set<string>();
  for (const write of pending) {
    if (
      pullKeys.has(write.documentKey) ||
      failedDocuments.has(write.documentKey) ||
      write.updatedAt > (comparedVersions.get(write.documentKey) ?? 0)
    )
      continue;
    // An equal revision already exists remotely, including a successful push whose response was lost.
    if (pushKeys.has(write.documentKey)) {
      try {
        await apiFetch(write.path, {
          ...context,
          method: write.method,
          body: write.body,
          sync: { id: write.id, updatedAt: write.updatedAt },
        });
      } catch (error) {
        failures.push(error);
        failedDocuments.add(write.documentKey);
        continue;
      }
    }
    // Only this revision is acknowledged; newer edits and their durable queue remain untouched.
    await store.transaction(['writes'], (tx) => {
      tx.objectStore('writes').delete(write.key);
    });
    acknowledged = true;
  }
  const final = await compare();
  await store.transaction(['pulls', 'documents'], async (tx) => {
    for (const meta of final.toPull) {
      const key = documentKey(scope, meta.kind, meta.id);
      tx.objectStore('pulls').put({
        ...meta,
        key,
        scope: scope.key,
      } satisfies PendingPull);
      const current = (await store.result(
        tx.objectStore('documents').get(key),
      )) as LocalDocument | undefined;
      if (current && current.updatedAt <= meta.updatedAt)
        tx.objectStore('documents').put({
          ...current,
          syncStatus: 'pending-pull',
        });
    }
  });
  for (const meta of await store.rows<PendingPull>('pulls', scope.key)) {
    try {
      await pull(scope, context, meta);
    } catch (error) {
      failures.push(error);
    }
  }
  await store.transaction(['documents', 'settings', 'writes'], async (tx) => {
    const docs = tx.objectStore('documents');
    const all = (await store.result(
      docs.index('scope').getAll(scope.key),
    )) as LocalDocument[];
    const remaining = (await store.result(
      tx.objectStore('writes').index('scope').getAll(scope.key),
    )) as { documentKey: string }[];
    for (const row of all) {
      // Equal revisions require no full transfer. Pending edits racing this run keep their state.
      if (
        !row.localOnly &&
        !remaining.some((write) => write.documentKey === row.key) &&
        !final.toPush.some(
          (meta) => meta.id === row.id && meta.kind === row.kind,
        ) &&
        row.syncStatus === 'pending-push'
      ) {
        docs.put({ ...row, syncStatus: 'synced', lastSyncedAt: Date.now() });
      }
    }
    tx.objectStore('settings').put({
      key: scope.key,
      scope: scope.key,
      initialized: true,
    });
  });
  if (acknowledged) store.changed();
  if (failures.length) throw failures[0];
}

async function pull(scope: Scope, context: RequestOptions, meta: Meta) {
  const key = documentKey(scope, meta.kind, meta.id);
  const before = await store.get<LocalDocument>('documents', key);
  let data = before?.data ?? { id: meta.id };
  let deleted = Boolean(meta.deleted);
  if (!deleted) {
    try {
      const response = await apiFetch<Record<string, LocalDocument['data']>>(
        `/${plural[meta.kind]}/${meta.id}`,
        context,
      );
      data = response[meta.kind];
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) deleted = true;
      else throw error;
    }
  }
  let updated = false;
  await store.transaction(['documents', 'writes', 'pulls'], async (tx) => {
    const docs = tx.objectStore('documents');
    const current = (await store.result(docs.get(key))) as
      LocalDocument | undefined;
    tx.objectStore('pulls').delete(key);
    if (current && !deleted && current.updatedAt > meta.updatedAt) return;
    docs.put({
      key,
      scope: scope.key,
      kind: meta.kind,
      id: meta.id,
      updatedAt: meta.updatedAt,
      data,
      deleted,
      syncStatus: 'synced',
      lastSyncedAt: Date.now(),
    } satisfies LocalDocument);
    const queue = tx.objectStore('writes');
    const writes = (await store.result(
      queue.index('scope').getAll(scope.key),
    )) as { key: string; documentKey: string; updatedAt: number }[];
    for (const write of writes)
      if (
        write.documentKey === key &&
        (deleted || write.updatedAt <= meta.updatedAt)
      )
        queue.delete(write.key);
    updated = true;
  });
  if (updated) store.changed();
}

async function pushScan(
  scope: Scope,
  context: RequestOptions,
  scan: PendingScan,
) {
  const binary = await store.get<{ files: Blob[] }>('blobs', scan.key);
  if (!binary)
    throw new Error(
      'Saved scan files are unavailable. Export pending work before retrying.',
    );
  const files = binary.files.map(
    (blob, index) =>
      new File([blob], scan.filenames[index], { type: blob.type }),
  );
  // Complete is idempotent, including a response lost before the browser could acknowledge it.
  let completed = false;
  try {
    const response = await apiFetch<{ queued: boolean }>('/uploads/complete', {
      ...context,
      method: 'POST',
      body: { uploadId: scan.id },
    });
    completed = response.queued;
  } catch (error) {
    if (!(error instanceof ApiError) || ![400, 404, 409].includes(error.status))
      throw error;
  }
  if (!completed) {
    const session: UploadSession = {
      clientRequestId: scan.id,
      kind: scan.kind,
      orderId: scan.orderId,
      uploadId: null,
      receiptId: null,
      recipeId: null,
      phase: 'presigning',
      ratio: null,
      sources: files.map((file) => ({
        file,
        status: 'pending',
        error: null,
        presign: null,
      })),
    };
    await uploadSources(files, scan.kind, {
      context: { token: context.token ?? null, shopId: scope.shopId },
      session,
      orderId: scan.orderId,
    });
  }
  await store.transaction(['documents', 'scans', 'blobs'], (tx) => {
    tx.objectStore('documents').delete(scan.documentKey);
    tx.objectStore('scans').delete(scan.key);
    tx.objectStore('blobs').delete(scan.key);
  });
  store.changed();
}
