import { useEffect, useState } from 'react';
import { useAuth, useShopMemberships } from '@/features/auth/supabase';
import * as store from './store';
import { scopeFor, type LocalDocument } from './types';
import { resolveDocumentConflict } from './conflicts';
import { syncDocuments } from './engine';

export function SyncConflicts() {
  const { token, user } = useAuth();
  const { activeShopId } = useShopMemberships(user?.id);
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const [error, setError] = useState('');
  const scope =
    token && activeShopId ? scopeFor(token, activeShopId).key : null;
  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (!scope) {
        setDocuments([]);
        return;
      }
      void store
        .documents(scope)
        .then((rows) => {
          if (active) setDocuments(rows.filter((row) => row.conflicts?.length));
        })
        .catch(() => {
          if (active) setError('Cannot read saved conflicts.');
        });
    };
    refresh();
    const unsubscribe = store.subscribe(refresh);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [scope]);
  const visible = documents.filter((row) => row.scope === scope);
  if (!visible.length) return null;
  return (
    <section
      aria-label="Conflicting edits"
      className="relative z-50 border border-red-300 bg-surface-canvas p-3 text-sm"
    >
      <p role="status">
        Some fields changed while you were editing. Choose which changes to
        keep.
      </p>
      {error && <p role="alert">{error}</p>}
      {visible.flatMap((row) =>
        (row.conflicts ?? []).map((field) => (
          <div
            key={`${row.key}:${field}`}
            className="my-2 flex flex-wrap items-center gap-3"
          >
            <span>
              {String(row.data.name ?? row.data.merchantName ?? row.kind)}:{' '}
              {field === '$deleted'
                ? 'Deleted elsewhere. Export pending work before accepting if you need a copy.'
                : field.startsWith('$')
                  ? 'Document changes'
                  : field}
            </span>
            {(['local', 'server'] as const).map((choice) => (
              <button
                key={choice}
                type="button"
                className="underline"
                disabled={choice === 'local' && row.remoteDeleted}
                onClick={() => {
                  if (!token || !activeShopId) return;
                  setError('');
                  void resolveDocumentConflict(row.key, field, choice)
                    .then(() =>
                      syncDocuments(scopeFor(token, activeShopId), {
                        token,
                        shopId: activeShopId,
                      }),
                    )
                    .catch(() =>
                      setError(
                        'Could not resolve or sync this change. Your saved work is retained.',
                      ),
                    );
                }}
              >
                {choice === 'local'
                  ? 'Keep my change'
                  : row.remoteDeleted
                    ? 'Accept deletion'
                    : 'Use server change'}
              </button>
            ))}
          </div>
        )),
      )}
    </section>
  );
}
