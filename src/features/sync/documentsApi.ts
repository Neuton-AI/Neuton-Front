import { apiFetch, type RequestOptions } from '@/lib/api';
import { type MediaKind } from '@/features/uploads/types';
import { validateUploadFiles } from '@/features/uploads/uploadSources';
import { syncDocuments } from './engine';
import { optimisticRecipe } from './optimisticRecipe';
import * as store from './store';
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
  )
    return apiFetch<T>(path, context);
  const scope = scopeFor(context.token, context.shopId);
  if (context.method && context.method !== 'GET')
    return mutate<T>(path, kind, id, action, scope, context);
  const local = await store.documents(scope.key);
  if (!local.length && !(await store.get('settings', scope.key))) {
    await syncDocuments(scope, context);
  } else {
    void syncDocuments(scope, context).catch(() => undefined);
  }
  const records = (await store.documents(scope.key)).filter(
    (row) => row.kind === kind && !row.deleted,
  );
  if (id) {
    const record = records.find((row) => row.id === id);
    if (!record)
      throw new Error(
        'This document is not saved on this device. Connect and retry.',
      );
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
}

async function mutate<T>(
  path: string,
  kind: Kind,
  id: string | undefined,
  action: string | undefined,
  scope: ReturnType<typeof scopeFor>,
  context: RequestOptions,
): Promise<T> {
  if (!id) throw new Error('Connect to create an order.');
  const key = documentKey(scope, kind, id);
  let response: unknown;
  await store.transaction(['documents', 'writes'], async (tx) => {
    const docs = tx.objectStore('documents');
    const old = (await store.result(docs.get(key))) as
      LocalDocument | undefined;
    if (!old || old.deleted || old.localOnly)
      throw new Error(
        'Wait for this document to synchronize before editing it.',
      );
    const updatedAt = Math.max(Date.now(), old.updatedAt + 1);
    const body = context.body as Record<string, unknown> | undefined;
    const deleted = context.method === 'DELETE';
    if (deleted && kind === 'receipt' && old.data.status === 'verified')
      throw new Error('Verified receipts cannot be deleted.');
    const data: DocumentData = {
      ...(kind === 'recipe' && context.method === 'PATCH' && body
        ? optimisticRecipe(old.data, body)
        : old.data),
      ...(action ? {} : body),
      id,
      ...(action === 'verify'
        ? { status: kind === 'order' ? 'delivered' : 'verified' }
        : {}),
      updatedAt: new Date(updatedAt).toISOString(),
    };
    docs.put({
      ...old,
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
      body: context.body,
    } satisfies PendingWrite);
    response = deleted
      ? { ok: true, mode: 'soft' }
      : kind === 'receipt' && action === 'verify'
        ? {
            receiptId: id,
            status: 'verified',
            accepted: ((body?.items as { accepted: boolean }[]) ?? []).filter(
              (item) => item.accepted,
            ).length,
            rejected: ((body?.items as { accepted: boolean }[]) ?? []).filter(
              (item) => !item.accepted,
            ).length,
          }
        : { [kind]: data };
  });
  store.changed();
  void syncDocuments(scope, context).catch(() => undefined);
  return response as T;
}

export async function saveScan(
  files: readonly File[],
  kind: MediaKind,
  context: RequestOptions,
  orderId?: string,
) {
  const error = validateUploadFiles(files);
  if (error) throw new Error(error);
  const scope = scopeFor(context.token, context.shopId);
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
  await store.transaction(['documents', 'scans', 'blobs'], (tx) => {
    // Attachments to an existing order do not create another order card.
    if (kind !== 'order')
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
  });
  store.changed();
  void syncDocuments(scope, context).catch(() => undefined);
}
