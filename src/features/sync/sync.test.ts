import 'fake-indexeddb/auto';
import { File as NativeFile } from 'node:buffer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { documentFetch, saveScan } from './documentsApi';
import { syncDocuments } from './engine';
import * as store from './store';
import { documentKey, scopeFor, type LocalDocument } from './types';

vi.unmock('./documentsApi');
const api = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@/lib/api', async (original) => ({
  ...(await original<typeof import('@/lib/api')>()),
  apiFetch: api.fetch,
}));
const token = `header.${btoa(JSON.stringify({ sub: 'user-one' }))}.signature`;
const context = { token, shopId: 'shop-one' };
const scope = scopeFor(token, context.shopId);
const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const key = documentKey(scope, 'recipe', id);
const original: LocalDocument = {
  key,
  scope: scope.key,
  kind: 'recipe',
  id,
  updatedAt: 100,
  data: { id, name: 'Original', createdAt: '2026-01-01' },
  deleted: false,
  syncStatus: 'synced',
};

beforeEach(async () => {
  // Native structuredClone preserves native Blobs; jsdom's Blob implementation is not cloneable by Node.
  vi.stubGlobal('File', NativeFile);
  api.fetch.mockReset();
  Object.defineProperty(navigator, 'onLine', {
    value: false,
    configurable: true,
  });
  await store.transaction(
    ['documents', 'writes', 'pulls', 'scans', 'blobs', 'settings'],
    (tx) => {
      for (const name of [
        'documents',
        'writes',
        'pulls',
        'scans',
        'blobs',
        'settings',
      ])
        tx.objectStore(name).clear();
      tx.objectStore('documents').put(original);
    },
  );
});
const online = () =>
  Object.defineProperty(navigator, 'onLine', {
    value: true,
    configurable: true,
  });

describe('local-first persistence and synchronization', () => {
  it('renders stored data while the network never resolves, and isolates users and shops', async () => {
    online();
    let release!: (value: unknown) => void;
    api.fetch.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    expect(await documentFetch(`/recipes/${id}`, context)).toEqual({
      recipe: original.data,
    });
    expect(await store.documents(scopeFor(token, 'another-shop').key)).toEqual(
      [],
    );
    const another = `header.${btoa(JSON.stringify({ sub: 'another-user' }))}.signature`;
    expect(
      await store.documents(scopeFor(another, context.shopId).key),
    ).toEqual([]);
    // Release this scope's single-flight run before subsequent tests.
    release({ toPush: [], toPull: [] });
    await syncDocuments(scope, context);
  });

  it('atomically persists offline edits and queue entries across another database connection', async () => {
    await documentFetch(`/recipes/${id}`, {
      ...context,
      method: 'PATCH',
      body: { name: 'Offline' },
    });
    expect((await store.get<LocalDocument>('documents', key))?.data.name).toBe(
      'Offline',
    );
    expect(await store.writes(scope.key)).toHaveLength(1);
    expect(api.fetch).not.toHaveBeenCalled();
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('neuton-documents-v1');
      request.onsuccess = () => resolve(request.result);
    });
    const persisted = await store.result(
      db.transaction('writes').objectStore('writes').getAll(),
    );
    expect(persisted).toHaveLength(1);
    db.close();
  });

  it('shows ingredient edits offline and marks their prices incomplete until recalculation', async () => {
    await store.transaction(['documents'], (tx) => {
      tx.objectStore('documents').put({
        ...original,
        data: {
          ...original.data,
          costing: {
            ingredients: [
              { name: 'Flour', rawName: 'Flour', quantity: 1, rawSrcUnit: 'g' },
            ],
            unitCost: 2,
            retailPrice: 3,
          },
        },
      });
    });
    await documentFetch(`/recipes/${id}`, {
      ...context,
      method: 'PATCH',
      body: {
        ingredients: [
          {
            rawName: 'Flour',
            rawMaterialName: 'Flour',
            quantity: 2,
            rawSrcUnit: 'g',
            inventoryItemId: null,
            generalPriceId: null,
          },
        ],
      },
    });
    const data = (await store.get<LocalDocument>('documents', key))?.data;
    expect(data?.costing).toMatchObject({
      ingredients: [{ quantity: 2 }],
      unitCost: null,
      retailPrice: null,
      costComplete: false,
    });
  });

  it('stores binary scans separately and retains both blobs and queue on failure', async () => {
    await saveScan(
      [new File(['scan bytes'], 'scan.jpg', { type: 'image/jpeg' })],
      'receipt',
      context,
    );
    const [scan] = await store.scans(scope.key);
    expect(scan.filenames).toEqual(['scan.jpg']);
    expect(await store.get('blobs', scan.key)).toBeDefined();
    expect(
      (await store.documents(scope.key)).find((row) => row.id === scan.id)
        ?.data,
    ).not.toHaveProperty('files');
    online();
    api.fetch.mockRejectedValue(new ApiError('offline', 0));
    // Use a separate scope in the first test so its intentionally hung network cannot interfere.
    await expect(syncDocuments(scope, context)).rejects.toThrow('offline');
    expect(await store.scans(scope.key)).toHaveLength(1);
    expect(await store.get('blobs', scan.key)).toBeDefined();
  });

  it('does not acknowledge or overwrite an edit made while an older push is in flight', async () => {
    await documentFetch(`/recipes/${id}`, {
      ...context,
      method: 'PATCH',
      body: { name: 'First' },
    });
    let release!: () => void;
    let started!: () => void;
    const pushing = new Promise<void>((resolve) => {
      started = resolve;
    });
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    let checks = 0;
    api.fetch.mockImplementation(async (path: string) => {
      if (path === '/sync/check') {
        checks++;
        return {
          toPush:
            checks === 1
              ? [{ kind: 'recipe', id, updatedAt: 200 }]
              : [{ kind: 'recipe', id, updatedAt: 300 }],
          toPull: [],
        };
      }
      started();
      await hold;
      return { recipe: original.data };
    });
    online();
    const sync = syncDocuments(scope, context);
    await pushing;
    await documentFetch(`/recipes/${id}`, {
      ...context,
      method: 'PATCH',
      body: { name: 'Newer edit' },
    });
    release();
    await sync;
    expect((await store.get<LocalDocument>('documents', key))?.data.name).toBe(
      'Newer edit',
    );
    expect((await store.get<LocalDocument>('documents', key))?.syncStatus).toBe(
      'pending-push',
    );
    expect(await store.writes(scope.key)).toHaveLength(1);
  });

  it('pulls newer server versions and tombstones, removing obsolete pending work', async () => {
    await documentFetch(`/recipes/${id}`, {
      ...context,
      method: 'PATCH',
      body: { name: 'Local edit' },
    });
    const version = Date.now() + 10000;
    online();
    api.fetch.mockImplementation(async (path: string) =>
      path === '/sync/check'
        ? { toPush: [], toPull: [{ kind: 'recipe', id, updatedAt: version }] }
        : { recipe: { id, name: 'From device two' } },
    );
    await syncDocuments(scope, context);
    expect((await store.get<LocalDocument>('documents', key))?.data.name).toBe(
      'From device two',
    );
    expect(await store.writes(scope.key)).toEqual([]);
    api.fetch.mockResolvedValue({
      toPush: [],
      toPull: [{ kind: 'recipe', id, updatedAt: version + 1, deleted: true }],
    });
    await syncDocuments(scope, context);
    expect((await store.get<LocalDocument>('documents', key))?.deleted).toBe(
      true,
    );
  });

  it('does not transfer full documents for equal versions', async () => {
    online();
    api.fetch.mockResolvedValue({ toPush: [], toPull: [] });
    await syncDocuments(scope, context);
    expect(api.fetch.mock.calls.every(([path]) => path === '/sync/check')).toBe(
      true,
    );
  });

  it('acknowledges an equal queued revision without uploading its full payload again', async () => {
    await documentFetch(`/recipes/${id}`, {
      ...context,
      method: 'PATCH',
      body: { name: 'Already on server' },
    });
    online();
    api.fetch.mockResolvedValue({ toPush: [], toPull: [] });
    await syncDocuments(scope, context);
    expect(api.fetch.mock.calls.every(([path]) => path === '/sync/check')).toBe(
      true,
    );
    expect(await store.writes(scope.key)).toEqual([]);
    expect((await store.get<LocalDocument>('documents', key))?.syncStatus).toBe(
      'synced',
    );
  });

  it('persists pending downloads when a full-document request fails', async () => {
    online();
    api.fetch.mockImplementation(async (path: string) => {
      if (path === '/sync/check')
        return { toPush: [], toPull: [{ kind: 'recipe', id, updatedAt: 200 }] };
      throw new ApiError('Connection dropped during pull', 0);
    });
    await expect(syncDocuments(scope, context)).rejects.toThrow(
      'Connection dropped during pull',
    );
    expect(await store.rows('pulls', scope.key)).toHaveLength(1);
    expect((await store.get<LocalDocument>('documents', key))?.data.name).toBe(
      'Original',
    );
    expect((await store.get<LocalDocument>('documents', key))?.syncStatus).toBe(
      'pending-pull',
    );
  });

  it('clears synced records at logout but retains private pending work', async () => {
    await saveScan(
      [new File(['scan'], 'scan.jpg', { type: 'image/jpeg' })],
      'receipt',
      context,
    );
    await store.logoutCleanup(scope.userId);
    expect(await store.get('documents', key)).toBeUndefined();
    expect(await store.scans(scope.key)).toHaveLength(1);
    expect(await store.documents(scope.key)).toHaveLength(1);
  });

  it('rolls back a local edit if the durable queue cannot be stored because of quota', async () => {
    const put = IDBObjectStore.prototype.put;
    const mock = vi
      .spyOn(IDBObjectStore.prototype, 'put')
      .mockImplementation(function (
        this: IDBObjectStore,
        ...args: Parameters<typeof put>
      ) {
        if (this.name === 'writes')
          throw new DOMException('No space', 'QuotaExceededError');
        return put.apply(this, args);
      });
    await expect(
      documentFetch(`/recipes/${id}`, {
        ...context,
        method: 'PATCH',
        body: { name: 'Unsaved' },
      }),
    ).rejects.toThrow('Device storage is full');
    mock.mockRestore();
    expect((await store.get<LocalDocument>('documents', key))?.data.name).toBe(
      'Original',
    );
    expect(await store.writes(scope.key)).toEqual([]);
  });

  it('retries a lost scan completion response with the same identity and no duplicate upload', async () => {
    await saveScan(
      [new File(['scan'], 'scan.jpg', { type: 'image/jpeg' })],
      'receipt',
      context,
    );
    const [scan] = await store.scans(scope.key);
    let completionCalls = 0;
    api.fetch.mockImplementation(async (path: string) => {
      if (path === '/uploads/complete') {
        completionCalls++;
        if (completionCalls === 1) throw new ApiError('Not created yet', 404);
        if (completionCalls === 2) throw new ApiError('Response lost', 0);
        return { queued: true, receiptId: id };
      }
      if (path === '/uploads/presign')
        return {
          uploadId: scan.id,
          receiptId: id,
          recipeId: null,
          method: 'PUT',
          sources: [
            {
              sourceId: 'source',
              uploadUrl: 'https://storage.test/scan',
              contentType: 'image/jpeg',
            },
          ],
        };
      return { toPush: [], toPull: [] };
    });
    const upload = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    vi.stubGlobal('fetch', upload);
    online();
    await expect(syncDocuments(scope, context)).rejects.toThrow(
      'Response lost',
    );
    expect(await store.scans(scope.key)).toHaveLength(1);
    await syncDocuments(scope, context);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(
      api.fetch.mock.calls.find(([path]) => path === '/uploads/presign')?.[1]
        .body.clientRequestId,
    ).toBe(scan.id);
    expect(await store.scans(scope.key)).toEqual([]);
    expect(await store.get('blobs', scan.key)).toBeUndefined();
  });
});
