import { apiFetch, ApiError, type RequestOptions } from '@/lib/api';
import {
  uploadSources,
  UploadSourcesError,
  type UploadSession,
} from '@/features/uploads/uploadSources';
import * as store from './store';
import { mergeDraft } from './merge';
import { rebaseBody } from './rebaseBody';
import {
  errorsFor,
  recordError,
  resolveErrors,
  pruneErrors,
  writeContext,
  type ErrorContext,
} from './errors';
import {
  documentKey,
  type Kind,
  type LocalDocument,
  type PendingPull,
  type PendingScan,
  type PendingWrite,
  type Scope,
} from './types';

type Meta = { kind: Kind; id: string; updatedAt: number; deleted?: boolean };
type Comparison = { toPush: Meta[]; toPull: Meta[] };
const plural = { receipt: 'receipts', recipe: 'recipes', order: 'orders' };
const running = new Map<string, Promise<void>>();
const rerun = new Set<string>();
export const syncActivity = new Map<
  string,
  {
    running: boolean;
    entity: string;
    operation: string;
    message: string;
    completedAt?: number;
  }
>();
const authenticatedTokens = new Map<string, string | null | undefined>();

export function syncDocuments(
  scope: Scope,
  context: RequestOptions,
  options: { force?: boolean } = {},
): Promise<void> {
  if (!navigator.onLine) return Promise.resolve();
  const previous = running.get(scope.key);
  if (previous) return previous;
  const reauthenticated =
    !authenticatedTokens.has(scope.key) ||
    authenticatedTokens.get(scope.key) !== context.token;
  authenticatedTokens.set(scope.key, context.token);
  const run = (async () => {
    do {
      await synchronize(
        scope,
        // A caller may be saving a PATCH; sync downloads must start as GETs.
        { token: context.token, shopId: context.shopId },
        options.force ?? false,
        reauthenticated,
      );
    } while (rerun.delete(scope.key));
  })().finally(() => {
    running.delete(scope.key);
    const activity = syncActivity.get(scope.key);
    if (activity) syncActivity.set(scope.key, { ...activity, running: false });
    store.changed();
  });
  running.set(scope.key, run);
  return run;
}

async function synchronize(
  scope: Scope,
  context: RequestOptions,
  force: boolean,
  reauthenticated: boolean,
) {
  if (!navigator.onLine) return;
  // Web Locks serialize tabs as well as in-process runs. Server retry receipts also protect older browsers.
  const perform = () => transfer(scope, context, force, reauthenticated);
  if (navigator.locks)
    await navigator.locks.request(`neuton-sync:${scope.key}`, perform);
  else await perform();
}

async function transfer(
  scope: Scope,
  context: RequestOptions,
  force: boolean,
  reauthenticated: boolean,
) {
  const failures: unknown[] = [];
  let lastSuccess: ReturnType<typeof syncActivity.get>;
  let authenticationFailed = false;
  const metadata: ErrorContext = {
    scope,
    entity: 'sync',
    documentId: null,
    operation: 'metadata-check',
    phase: 'metadata-check',
    operationId: 'metadata',
    revision: 0,
  };
  const existing = await errorsFor(scope.key);
  if (
    existing.some(
      (row) => row.state === 'unresolved' && row.category === 'session_expired',
    ) &&
    !reauthenticated &&
    !force
  )
    return;
  const attempt = async (
    identity: ErrorContext,
    work: () => Promise<void>,
    notify = true,
  ) => {
    if (authenticationFailed) return false;
    const blocked = (await errorsFor(scope.key)).filter(
      (row) =>
        row.state === 'unresolved' &&
        row.operationId === identity.operationId &&
        row.revision === identity.revision,
    );
    if (
      !force &&
      blocked.some(
        (row) =>
          !(reauthenticated && row.category === 'session_expired') &&
          (!row.retryable || (row.nextRetryAt ?? 0) > Date.now()),
      )
    )
      return false;
    syncActivity.set(scope.key, {
      running: true,
      entity: identity.entity,
      operation: identity.operation,
      message: 'In progress',
    });
    store.changed();
    try {
      await work();
      await resolveErrors(identity);
      if (notify)
        syncActivity.set(
          scope.key,
          (lastSuccess = {
            running: true,
            entity: identity.entity,
            operation: identity.operation,
            message:
              identity.operation === 'upload'
                ? 'Upload succeeded'
                : 'Sync succeeded',
            completedAt: Date.now(),
          }),
        );
      return true;
    } catch (error) {
      if (
        (error instanceof Error || error instanceof DOMException) &&
        error.name === 'AbortError'
      )
        return false;
      const upload = error instanceof UploadSourcesError ? error : null;
      if (upload?.failures.length) {
        for (const failure of upload.failures)
          await recordError(failure.error, {
            ...identity,
            phase: failure.phase,
            sourceIndex: failure.sourceIndex,
            sourceId: failure.sourceId,
          });
      } else await recordError(upload?.cause ?? error, identity);
      if (
        (error instanceof ApiError && error.status === 401) ||
        (upload?.cause instanceof ApiError && upload.cause.status === 401)
      )
        authenticationFailed = true;
      failures.push(error);
      return false;
    }
  };
  try {
    for (const scan of await store.scans(scope.key)) {
      await attempt(
        {
          scope,
          entity: scan.kind,
          savedLocally: true,
          documentId: scan.id,
          operation: 'upload',
          phase: 'completion',
          operationId: scan.id,
          revision: scan.createdAt,
        },
        () => pushScan(scope, context, scan),
      );
    }
    let comparedVersions = new Map<string, number>();
    const compare = async () => {
      const local = await store.documents(scope.key);
      comparedVersions = new Map(local.map((row) => [row.key, row.updatedAt]));
      const metadataRows = local.filter((row) => !row.localOnly);
      const known = new Set(metadataRows.map((row) => `${row.kind}:${row.id}`));
      const toPull = new Map<string, Meta>(),
        toPush = new Map<string, Meta>();
      for (
        let offset = 0;
        offset < Math.max(1, metadataRows.length);
        offset += 20000
      ) {
        const chunk = metadataRows.slice(offset, offset + 20000);
        const included = new Set(chunk.map((row) => `${row.kind}:${row.id}`));
        const result = await apiFetch<Comparison>('/sync/check', {
          ...context,
          method: 'POST',
          body: {
            documents: chunk.map(
              ({ kind, id, updatedAt, deleted, serverVersion }) => ({
                kind,
                id,
                updatedAt,
                deleted,
                ...(serverVersion === undefined
                  ? {}
                  : { baseUpdatedAt: serverVersion }),
              }),
            ),
          },
        });
        for (const meta of result.toPush)
          toPush.set(`${meta.kind}:${meta.id}`, meta);
        for (const meta of result.toPull) {
          const key = `${meta.kind}:${meta.id}`;
          if (included.has(key) || !known.has(key)) toPull.set(key, meta);
        }
      }
      return { toPush: [...toPush.values()], toPull: [...toPull.values()] };
    };
    let comparison: Comparison = { toPush: [], toPull: [] };
    if (
      !(await attempt(
        metadata,
        async () => {
          comparison = await compare();
        },
        false,
      ))
    ) {
      if (failures.length) throw failures[0];
      return;
    }
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
      const document = await store.get<LocalDocument>(
        'documents',
        write.documentKey,
      );
      if (document?.conflicts?.length || document?.remoteDeleted) continue;
      if (
        (pullKeys.has(write.documentKey) && write.baseVersion === undefined) ||
        failedDocuments.has(write.documentKey) ||
        write.updatedAt > (comparedVersions.get(write.documentKey) ?? 0)
      )
        continue;
      const identity = writeContext(scope, write);
      // An equal revision already exists remotely, including a successful push whose response was lost.
      if (pushKeys.has(write.documentKey) || write.baseVersion !== undefined) {
        let conflicted = false;
        const pushed = await attempt(identity, async () => {
          const response = await apiFetch<
            { syncConflict?: boolean } | undefined
          >(write.path, {
            ...context,
            method: write.method,
            body: write.body,
            sync: {
              id: write.id,
              updatedAt: write.updatedAt,
              baseVersion: write.baseVersion,
            },
          });
          // The server's version negotiation is a successful protocol response, not a rejected edit.
          if (response?.syncConflict) conflicted = true;
        });
        if (conflicted) {
          failedDocuments.add(write.documentKey);
          continue;
        }
        if (!pushed) {
          failedDocuments.add(write.documentKey);
          continue;
        }
      }
      // Only this revision is acknowledged; newer edits and their durable queue remain untouched.
      const saved = await attempt(
        { ...identity, phase: 'local-persistence' },
        async () => {
          await store.transaction(
            ['writes', 'documents', 'pulls'],
            async (tx) => {
              const current = (await store.result(
                tx.objectStore('documents').get(write.documentKey),
              )) as LocalDocument | undefined;
              if (current)
                tx.objectStore('documents').put({
                  ...current,
                  serverVersion: write.updatedAt,
                });
              // Recipe PATCH returns the saved row without calculated ingredient costs.
              // Fetch the enriched detail even when revision negotiation now reports equality.
              if (current?.kind === 'recipe' && !current.deleted &&
                write.method === 'PATCH') {
              tx.objectStore('pulls').put({
                key: current.key,
                scope: scope.key,
                kind: current.kind,
                id: current.id,
                updatedAt: write.updatedAt,
              } satisfies PendingPull);
            }
              tx.objectStore('writes').delete(write.key);
            },
          );
        },
      );
      if (!saved) {
        failedDocuments.add(write.documentKey);
        continue;
      }
      acknowledged = true;
    }
    let final: Comparison = { toPush: [], toPull: [] };
    if (
      !(await attempt(
        metadata,
        async () => {
          final = await compare();
        },
        false,
      ))
    ) {
      if (failures.length) throw failures[0];
      return;
    }
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
      await attempt(
        {
          scope,
          entity: meta.kind,
          documentId: meta.id,
          operation: 'pull',
          phase: 'pull',
          operationId: meta.key,
          revision: meta.updatedAt,
        },
        () => pull(scope, context, meta),
        false,
      );
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
    if (lastSuccess) syncActivity.set(scope.key, lastSuccess);
    if (acknowledged) store.changed();
    await pruneErrors(scope.key);
  } catch (error) {
    if (!failures.includes(error))
      await recordError(error, { ...metadata, phase: 'local-persistence' });
    throw error;
  }
  if (failures.length) throw failures[0];
}

async function pull(scope: Scope, context: RequestOptions, meta: Meta) {
  const key = documentKey(scope, meta.kind, meta.id);
  const before = await store.get<LocalDocument>('documents', key);
  let data = before?.data ?? { id: meta.id };
  let deleted = Boolean(meta.deleted);
  if (!deleted) {
    try {
      const response = await apiFetch<Record<string, LocalDocument['data']> & { syncVersion?: number }>(
        `/${plural[meta.kind]}/${meta.id}`,
        { ...context, syncSnapshot: true },
      );
      data = response[meta.kind];
      if (response.syncVersion !== undefined) meta = { ...meta, updatedAt: response.syncVersion };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) deleted = true;
      else throw error;
    }
  }
  let updated = false;
  await store.transaction(
    ['documents', 'writes', 'pulls', 'syncErrors'],
    async (tx) => {
      const docs = tx.objectStore('documents');
      const current = (await store.result(docs.get(key))) as
        LocalDocument | undefined;
      tx.objectStore('pulls').delete(key);
      const placeholder = current?.localOnly === true;
      const writes = (await store.result(
        tx.objectStore('writes').index('scope').getAll(scope.key),
      )) as PendingWrite[];
      const pending = writes.filter((write) => write.documentKey === key);
      if (current && pending.length) {
        const base = current.serverData;
        const merged = base
          ? mergeDraft(base, current.data, data)
          : { data: current.data, conflicts: ['$document'] };
        const conflicts = new Set([
          ...(current.conflicts ?? []),
          ...merged.conflicts.filter((field) => field !== 'updatedAt'),
        ]);
        if (deleted) conflicts.add('$deleted');
        // Complex domain commands must be reviewed rather than replayed against a changed document.
        if (
          pending.some(
            (write) =>
              write.method !== 'PATCH' ||
              /\/(verify|deliver)$/.test(write.path),
          )
        )
          conflicts.add('$document');
        // A changed server document is rebased atomically with the durable queue.
        let rebasedVersion = current.updatedAt;
        if (!conflicts.size && current.serverVersion !== meta.updatedAt) {
          let revision = Math.max(
            Date.now(),
            meta.updatedAt + 1,
            current.updatedAt + 1,
          );
          let baseVersion = meta.updatedAt;
          for (const write of pending.sort(
            (a, b) => a.updatedAt - b.updatedAt,
          )) {
            const body = rebaseBody(write.body, merged.data);
            tx.objectStore('writes').delete(write.key);
            const id = crypto.randomUUID();
            tx.objectStore('writes').put({
              ...write,
              key: id,
              id,
              body,
              updatedAt: revision,
              baseVersion,
            });
            baseVersion = revision++;
          }
          rebasedVersion = revision - 1;
          rerun.add(scope.key);
        }
        docs.put({
          ...current,
          data: merged.data,
          serverData: data,
          serverVersion: meta.updatedAt,
          updatedAt: rebasedVersion,
          conflicts: [...conflicts],
          remoteDeleted: deleted,
          syncStatus: 'pending-push',
        } satisfies LocalDocument);
        updated = true;
        return;
      }
      if (
        current &&
        !placeholder &&
        !deleted &&
        current.updatedAt > meta.updatedAt
      )
        return;
      if (
        placeholder &&
        current &&
        !deleted &&
        (data.status === 'pending' || data.status === 'processing')
      )
        data = { ...current.data, ...data };
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
        serverVersion: meta.updatedAt,
        serverData: data,
      } satisfies LocalDocument);
      const queue = tx.objectStore('writes');
      for (const write of writes)
        if (
          write.documentKey === key &&
          (deleted || write.updatedAt <= meta.updatedAt)
        )
          queue.delete(write.key);
      const errors = (await store.result(
        tx.objectStore('syncErrors').index('scope').getAll(scope.key),
      )) as import('./errors').SyncError[];
      for (const error of errors) {
        if (
          error.entity === meta.kind &&
          error.documentId === meta.id &&
          error.revision <= meta.updatedAt &&
          error.state === 'unresolved'
        ) {
          tx.objectStore('syncErrors').put({ ...error, state: 'superseded' });
        }
      }
      updated = true;
    },
  );
  if (updated) store.changed();
  if (updated && !deleted && data.status === 'failed') {
    await recordError(
      new ApiError(
        typeof data.errorMessage === 'string'
          ? data.errorMessage
          : 'Processing failed',
        422,
        'PROCESSING_FAILED',
      ),
      {
        scope,
        entity: meta.kind,
        documentId: meta.id,
        operation: 'upload',
        phase: 'processing',
        operationId: `job:${key}`,
        revision: meta.updatedAt,
        savedLocally: true,
      },
    );
  }
}

async function pushScan(
  scope: Scope,
  context: RequestOptions,
  scan: PendingScan,
) {
  const binary = await store.get<{ files: Blob[] }>('blobs', scan.key);
  if (!binary)
    throw new DOMException('Saved scan files unavailable', 'NotFoundError');
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
      body: { uploadId: scan.upload?.uploadId ?? scan.id },
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
      uploadId: scan.upload?.uploadId ?? null,
      receiptId: scan.upload?.receiptId ?? null,
      recipeId: scan.upload?.recipeId ?? null,
      phase: 'presigning',
      ratio: null,
      sources: files.map((file, index) => ({
        file,
        status: scan.upload?.sources[index]?.uploaded ? 'uploaded' : 'pending',
        error: null,
        presign: scan.upload?.sources[index]?.sourceId
          ? {
              sourceId: scan.upload.sources[index].sourceId!,
              uploadUrl: '',
              storagePath: '',
              contentType: file.type,
              originalFilename: file.name,
              byteSize: file.size,
            }
          : null,
      })),
    };
    await uploadSources(files, scan.kind, {
      context: { token: context.token ?? null, shopId: scope.shopId },
      session,
      orderId: scan.orderId,
      persistProgress: async (progress) => {
        await store.transaction(['scans'], (tx) => {
          tx.objectStore('scans').put({
            ...scan,
            upload: {
              uploadId: progress.uploadId,
              receiptId: progress.receiptId,
              recipeId: progress.recipeId,
              sources: progress.sources.map((source) => ({
                sourceId: source.presign?.sourceId ?? null,
                uploaded: source.status === 'uploaded',
              })),
            },
          } satisfies PendingScan);
        });
      },
    });
  }
  await store.transaction(['scans', 'blobs'], (tx) => {
    tx.objectStore('scans').delete(scan.key);
    tx.objectStore('blobs').delete(scan.key);
  });
  store.changed();
}
