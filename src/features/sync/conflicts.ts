import * as store from './store';
import type { LocalDocument } from './types';
import { rebaseBody } from './rebaseBody';

/** Explicit resolution is persisted together with rebased mutation identities. */
export async function resolveDocumentConflict(
  key: string,
  field: string,
  choice: 'local' | 'server',
) {
  await store.transaction(['documents', 'writes'], async (tx) => {
    const docs = tx.objectStore('documents'),
      queue = tx.objectStore('writes');
    const current = (await store.result(docs.get(key))) as
      LocalDocument | undefined;
    if (
      !current?.conflicts?.includes(field) ||
      !current.serverData ||
      current.serverVersion === undefined
    )
      return;
    if (current.remoteDeleted && choice === 'local')
      throw new Error('Export your draft before accepting the deletion.');
    const writes = (await store.result(
      queue.index('scope').getAll(current.scope),
    )) as import('./types').PendingWrite[];
    const pending = writes
      .filter((write) => write.documentKey === key)
      .sort((a, b) => a.updatedAt - b.updatedAt);
    let data = { ...current.data };
    const whole = field.startsWith('$');
    if (choice === 'server') {
      if (whole) data = current.serverData;
      else if (Object.prototype.hasOwnProperty.call(current.serverData, field))
        data[field] = current.serverData[field];
      else delete data[field];
    }
    const conflicts = whole
      ? []
      : current.conflicts.filter((item) => item !== field);
    let revision = Math.max(
      Date.now(),
      current.updatedAt + 1,
      current.serverVersion + 1,
    );
    let baseVersion = current.serverVersion;
    for (const write of pending) {
      queue.delete(write.key);
      if (whole && choice === 'server') continue;
      const body = rebaseBody(write.body, data);
      if (choice === 'server' && field in body) {
        if (field in current.serverData)
          body[field] = current.serverData[field];
        else delete body[field];
      }
      const id = crypto.randomUUID();
      queue.put({
        ...write,
        key: id,
        id,
        body,
        baseVersion,
        updatedAt: revision,
      });
      baseVersion = revision++;
    }
    const discarded = whole && choice === 'server';
    docs.put({
      ...current,
      data,
      conflicts,
      remoteDeleted: discarded ? false : current.remoteDeleted,
      deleted: discarded ? Boolean(current.remoteDeleted) : current.deleted,
      updatedAt: discarded ? current.serverVersion : revision - 1,
      syncStatus: discarded ? 'synced' : 'pending-push',
    } satisfies LocalDocument);
  });
  store.changed();
}
