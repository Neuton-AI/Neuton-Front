import 'fake-indexeddb/auto';
import { beforeEach, expect, it } from 'vitest';
import * as store from './store';
import { resolveDocumentConflict } from './conflicts';
import type { LocalDocument, PendingWrite } from './types';

const document: LocalDocument = {
  key: 'conflict-doc',
  scope: 'conflict-scope',
  kind: 'receipt',
  id: 'receipt',
  updatedAt: 100,
  data: { id: 'receipt', merchantName: 'Mine', status: 'unverified' },
  deleted: false,
  syncStatus: 'pending-push',
  serverVersion: 200,
  serverData: { id: 'receipt', merchantName: 'Theirs', status: 'unverified' },
  conflicts: ['merchantName'],
};
beforeEach(async () => {
  await store.transaction(['documents', 'writes'], (tx) => {
    tx.objectStore('documents').clear();
    tx.objectStore('writes').clear();
    tx.objectStore('documents').put(document);
    tx.objectStore('writes').put({
      key: 'old',
      id: 'old',
      scope: document.scope,
      documentKey: document.key,
      updatedAt: 100,
      method: 'PATCH',
      path: '/receipts/receipt',
      body: { merchantName: 'Mine' },
      baseVersion: 50,
    } satisfies PendingWrite);
  });
});
it.each(['local', 'server'] as const)(
  'resolves a field using %s and rebases the durable request',
  async (choice) => {
    await resolveDocumentConflict(document.key, 'merchantName', choice);
    const saved = await store.get<LocalDocument>('documents', document.key);
    const [write] = await store.writes(document.scope);
    const name = choice === 'local' ? 'Mine' : 'Theirs';
    expect(saved?.data.merchantName).toBe(name);
    expect(saved?.conflicts).toEqual([]);
    expect(write.body).toEqual({ merchantName: name });
    expect(write.baseVersion).toBe(200);
    expect(write.id).not.toBe('old');
    expect(write.updatedAt).toBe(saved?.updatedAt);
  },
);
it('retains remotely deleted work until deletion is explicitly accepted', async () => {
  await store.transaction(['documents'], (tx) =>
    tx
      .objectStore('documents')
      .put({ ...document, remoteDeleted: true, conflicts: ['$deleted'] }),
  );
  await expect(
    resolveDocumentConflict(document.key, '$deleted', 'local'),
  ).rejects.toThrow();
  expect(await store.writes(document.scope)).toHaveLength(1);
  await resolveDocumentConflict(document.key, '$deleted', 'server');
  expect(
    (await store.get<LocalDocument>('documents', document.key))?.deleted,
  ).toBe(true);
  expect(await store.writes(document.scope)).toEqual([]);
});
it('resolving a conflicting field does not overwrite an incoming change to another field', async () => {
  await store.transaction(['documents', 'writes'], (tx) => {
    tx.objectStore('documents').put({
      ...document,
      data: { ...document.data, totalAmount: '25' },
    });
    tx.objectStore('writes').put({
      key: 'old',
      id: 'old',
      scope: document.scope,
      documentKey: document.key,
      updatedAt: 100,
      method: 'PATCH',
      path: '/receipts/receipt',
      body: { merchantName: 'Mine', totalAmount: 10 },
    });
  });
  await resolveDocumentConflict(document.key, 'merchantName', 'local');
  expect((await store.writes(document.scope))[0].body).toEqual({
    merchantName: 'Mine',
    totalAmount: 25,
  });
});
