import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth, useShopMemberships } from '@/features/auth/supabase';
import { syncDocuments, syncErrors } from './engine';
import * as store from './store';
import { scopeFor } from './types';

export function SyncStatus() {
  const { token, user } = useAuth();
  const { activeShopId } = useShopMemberships(user?.id);
  const client = useQueryClient();
  const location = useLocation();
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string>();
  const banner = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = banner.current;
    if (!element) return;
    const measure = () =>
      document.documentElement.style.setProperty(
        '--sync-status-height',
        `${element.offsetHeight}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--sync-status-height');
    };
  }, [online, pending, error]);
  useEffect(() => {
    const clear = () => {
      client.clear();
      setPending(0);
      setError(undefined);
    };
    window.addEventListener('neuton-account-change', clear);
    return () => window.removeEventListener('neuton-account-change', clear);
  }, [client]);
  useEffect(() => {
    if (!token || !activeShopId) return;
    const scope = scopeFor(token, activeShopId);
    let active = true;
    const refresh = () => {
      void Promise.all([store.writes(scope.key), store.scans(scope.key)])
        .then(([writes, scans]) => {
          if (!active) return;
          setPending(writes.length + scans.length);
          setError(syncErrors.get(scope.key));
          void client.invalidateQueries({
            predicate: (query) =>
              [
                'receipt',
                'receipts',
                'recipe',
                'recipes',
                'order',
                'orders',
              ].includes(String(query.queryKey[0])),
            refetchType: 'active',
          });
        })
        .catch((cause: unknown) => {
          if (active)
            setError(
              cause instanceof Error
                ? cause.message
                : 'Local storage unavailable.',
            );
        });
    };
    const sync = () => {
      setOnline(navigator.onLine);
      void syncDocuments(scope, { token, shopId: activeShopId }).catch(
        () => undefined,
      );
    };
    const unsubscribe = store.subscribe(refresh);
    refresh();
    sync();
    const timer = window.setInterval(sync, 30_000);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    window.addEventListener('focus', sync);
    return () => {
      active = false;
      unsubscribe();
      clearInterval(timer);
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      window.removeEventListener('focus', sync);
    };
  }, [token, activeShopId, client, location.pathname]);
  if (!token || !activeShopId || (online && !pending && !error)) return null;
  const retry = () => {
    const scope = scopeFor(token, activeShopId);
    void syncDocuments(scope, { token, shopId: activeShopId }).catch(
      () => undefined,
    );
  };
  const exportPending = async () => {
    const scope = scopeFor(token, activeShopId);
    const [documents, writes, scans, blobs] = await Promise.all([
      store.documents(scope.key),
      store.writes(scope.key),
      store.scans(scope.key),
      store.rows<{ key: string; files: Blob[] }>('blobs', scope.key),
    ]);
    const binary = await Promise.all(
      blobs.map(async (row) => ({
        key: row.key,
        files: await Promise.all(
          row.files.map(
            (blob) =>
              new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              }),
          ),
        ),
      })),
    );
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ documents, writes, scans, blobs: binary })], {
        type: 'application/json',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'neuton-pending-work.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <aside ref={banner} className="sync-status" role="status">
      <span>
        {!online ? 'Offline — saved documents are available. ' : ''}
        {pending
          ? `${pending} ${pending === 1 ? 'change' : 'changes'} saved on this device, waiting to sync. `
          : ''}
        {error}
      </span>
      {online && (
        <button type="button" onClick={retry}>
          Retry sync
        </button>
      )}
      {pending > 0 && (
        <button
          type="button"
          onClick={() => {
            void exportPending().catch((cause: unknown) =>
              setError(String(cause)),
            );
          }}
        >
          Export pending work
        </button>
      )}
    </aside>
  );
}
