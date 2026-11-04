import { beginLocalOperation, isContextAbort } from './authority';
import { apiFetch, ApiError, type RequestOptions } from '@/lib/api';
import { type MediaKind } from '@/features/uploads/types';
import { validateUploadFiles } from '@/features/uploads/uploadSources';
import { syncDocuments } from './engine';
import { optimisticRecipe } from './optimisticRecipe';
import * as store from './store';
import {
  errorsFor,
  recordError,
  supersedeLocalErrors,
  type ErrorContext,
} from './errors';
import {
  documentKey,
  scopeFor,
  type DocumentData,
  type Kind,
  type LocalDocument,
  type PendingWrite,
  type PendingScan,
} from './types';

const kinds: Record<string, Kind> = {
  receipts: 'receipt',
  recipes: 'recipe',
  orders: 'order',
};
export async function documentFetch<T>(
  path: string,
  context: RequestOptions,
): Promise<T> {
  const url = new URL(path, 'https://local');
  const [collection, id, action] = url.pathname.slice(1).split('/');
  const kind = kinds[collection];
  // Pricing and inventory remain online domain operations.
  if (
    !kind ||
    (!id && context.method === 'POST') ||
    id === 'orderable' ||
    id === 'quote' ||
    action === 'barcode-price' ||
    action === 'manual-product'
  ) {
    return apiFetch<T>(path, context);
  }
  const lease = beginLocalOperation(context);
  const { scope } = lease;
  context = { ...context, signal: lease.signal };
  try {
    if (context.method && context.method !== 'GET') {
      return await mutate<T>(
        path,
        kind,
        id,
        action,
        scope,
        context,
        lease.assertCurrent,
      );
    }
    const local = await store.documents(scope.key);
    if (!local.length && !(await store.get('settings', scope.key))) {
      try {
        await syncDocuments(scope, context);
      } catch (error) {
        if (isContextAbort(error)) throw error;
        lease.assertCurrent();
        throw new Error(
          (await errorsFor(scope.key)).find((row) => row.state === 'unresolved')
            ?.message ?? 'Sync failed',
        );
      }
    }
    const records = (await store.documents(scope.key)).filter(
      (row) => row.kind === kind && !row.deleted,
    );
    lease.assertCurrent();
    if (id) {
      const record = records.find((row) => row.id === id);
      if (!record) throw new Error('Document unavailable');
      return { [kind]: record.data } as T;
    }
    const status = url.searchParams.get('status');
    const data = records
      .filter((row) => !status || row.data.status === status)
      .sort((a, b) =>
        String(b.data.createdAt).localeCompare(String(a.data.createdAt)),
      )
      .map((row) => row.data);
    return {
      [collection]: data,
      ...(kind === 'order' ? { total: data.length } : {}),
    } as T;
  } finally {
    lease.dispose();
  }
}

async function mutate<T>(
  path: string,
  kind: Kind,
  id: string | undefined,
  action: string | undefined,
  scope: ReturnType<typeof scopeFor>,
  context: RequestOptions,
  assertCurrent: () => void,
): Promise<T> {
  assertCurrent();
  if (!id) throw new Error('Connection required');
  const key = documentKey(scope, kind, id);
  let operation: ErrorContext['operation'] = 'edit';
  if (action === 'verify') operation = 'verify';
  else if (context.method === 'DELETE') operation = 'delete';
  const identity: ErrorContext = {
    savedLocally: false,
    scope,
    entity: kind,
    documentId: id,
    operation,
    phase: 'local-persistence',
    operationId: key,
    revision: 0,
  };
  let response: unknown;
  try {
    await store.transaction(
      ['documents', 'writes'],
      async (tx) => {
        const docs = tx.objectStore('documents');
        const old = (await store.result(docs.get(key))) as
          LocalDocument | undefined;
        if (!old || old.deleted || old.localOnly) {
          throw new ApiError('Sync required', 422, 'SYNC_REQUIRED');
        }
        const updatedAt = Math.max(Date.now(), old.updatedAt + 1);
        const body = context.body as Record<string, unknown> | undefined;
        const deleted = context.method === 'DELETE';
        const verifiedStatus = kind === 'order' ? 'delivered' : 'verified';
        if (deleted && kind === 'receipt' && old.data.status === 'verified') {
          throw new ApiError('Deletion unavailable', 422, 'VERIFIED_RECEIPT');
        }
        const data: DocumentData = {
          ...(kind === 'recipe' && context.method === 'PATCH' && body
            ? optimisticRecipe(old.data, body)
            : old.data),
          ...(action ? {} : body),
          id,
          ...(action === 'verify' ? { status: verifiedStatus } : {}),
          updatedAt: new Date(updatedAt).toISOString(),
        };
        docs.put({
          ...old,
          serverVersion: old.serverVersion ?? old.updatedAt,
          serverData: old.serverData ?? old.data,
          data,
          deleted,
          updatedAt,
          syncStatus: 'pending-push',
        } satisfies LocalDocument);
        const mutationId = crypto.randomUUID();
        tx.objectStore('writes').put({
          key: mutationId,
          scope: scope.key,
          documentKey: key,
          id: mutationId,
          updatedAt,
          path,
          method: context.method,
          operation,
          body: context.body,
          baseVersion: old.updatedAt,
        } satisfies PendingWrite);
        if (deleted) response = { ok: true, mode: 'soft' };
        else if (kind === 'receipt' && action === 'verify') {
          response = {
            receiptId: id,
            status: 'verified',
            accepted: ((body?.items as { accepted: boolean }[]) ?? []).filter(
              (item) => item.accepted,
            ).length,
            rejected: ((body?.items as { accepted: boolean }[]) ?? []).filter(
              (item) => !item.accepted,
            ).length,
          };
        } else {
          response = { [kind]: data };
        }
      },
      assertCurrent,
    );
  } catch (error) {
    if (isContextAbort(error)) throw error;
    assertCurrent();
    await recordError(error, identity);
    throw new Error(
      (error instanceof Error || error instanceof DOMException) &&
        error.name === 'QuotaExceededError'
        ? 'Storage full'
        : 'Save failed',
    );
  }
  assertCurrent();
  await supersedeLocalErrors({ ...identity, revision: Date.now() });
  assertCurrent();
  store.changed();
  void syncDocuments(scope, context).catch(() => undefined);
  return response as T;
}

async function saveScanCurrent(
  files: readonly File[],
  kind: MediaKind,
  context: RequestOptions,
  orderId: string | undefined,
  assertCurrent: () => void,
) {
  const error = validateUploadFiles(files);
  if (error) throw new Error(error);
  const scope = scopeFor(context.identity, context.shopId);
  const id = crypto.randomUUID();
  const documentKind: Kind = kind === 'product' ? 'recipe' : kind;
  const key = documentKey(scope, documentKind, id);
  const createdAt = Date.now();
  const data = {
    id,
    shopId: scope.shopId,
    name: files[0].name,
    originalFilename: files[0].name,
    status: 'pending',
    createdAt: new Date(createdAt).toISOString(),
    updatedAt: new Date(createdAt).toISOString(),
    items: [],
    steps: [],
    allergens: [],
    yieldQuantity: '1',
    yieldUnit: 'portion',
    prepTimeMinutes: 0,
    storagePath: null,
    receiptDate: null,
    totalAmount: null,
    errorMessage: null,
    costing: {
      ingredients: [],
      ingredientsCost: 0,
      laborCost: 0,
      batchCost: null,
      unitCost: null,
      yieldQuantity: 1,
      retailPrice: null,
      appliedProfitMargin: 0,
      inStock: false,
      costComplete: false,
    },
  };
  try {
    await store.transaction(
      ['documents', 'scans', 'blobs'],
      (tx) => {
        // Attachments to an existing order do not create another order card.
        if (kind !== 'order') {
          tx.objectStore('documents').put({
            key,
            scope: scope.key,
            kind: documentKind,
            id,
            updatedAt: createdAt,
            data,
            deleted: false,
            localOnly: true,
            syncStatus: 'pending-push',
          } satisfies LocalDocument);
        }
        tx.objectStore('scans').put({
          key: id,
          scope: scope.key,
          documentKey: key,
          id,
          kind,
          orderId,
          filenames: files.map((file) => file.name),
          createdAt,
        } satisfies PendingScan);
        tx.objectStore('blobs').put({
          key: id,
          scope: scope.key,
          files: files.map((file) => file.slice(0, file.size, file.type)),
        });
      },
      assertCurrent,
    );
  } catch (error) {
    if (isContextAbort(error)) throw error;
    assertCurrent();
    await recordError(error, {
      scope,
      entity: kind,
      documentId: orderId ?? null,
      savedLocally: false,
      operation: 'upload',
      phase: 'local-persistence',
      operationId: `local-scan:${kind}:${orderId ?? ''}`,
      revision: 0,
    });
    throw new Error(
      (error instanceof Error || error instanceof DOMException) &&
        error.name === 'QuotaExceededError'
        ? 'Storage full'
        : 'Save failed',
    );
  }
  assertCurrent();
  await supersedeLocalErrors({
    scope,
    entity: kind,
    documentId: orderId ?? null,
    operation: 'upload',
    phase: 'local-persistence',
    operationId: `local-scan:${kind}:${orderId ?? ''}`,
    revision: createdAt,
  });
  assertCurrent();
  store.changed();
  void syncDocuments(scope, context).catch(() => undefined);
}

export async function saveScan(
  files: readonly File[],
  kind: MediaKind,
  context: RequestOptions,
  orderId?: string,
) {
  const lease = beginLocalOperation(context);
  try {
    await saveScanCurrent(
      files,
      kind,
      { ...context, signal: lease.signal },
      orderId,
      lease.assertCurrent,
    );
    lease.assertCurrent();
  } finally {
    lease.dispose();
  }
}
