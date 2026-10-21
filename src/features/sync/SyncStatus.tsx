import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  supabase,
  useAuth,
  useShopMemberships,
} from '@/features/auth/supabase';
import { syncDocuments, syncActivity } from './engine';
import { errorsFor, type SyncError } from './errors';
import * as store from './store';
import { scopeFor } from './types';
import { SyncPopup } from './SyncPopup';

const label = (value: string) =>
  value === 'metadata-check'
    ? 'Sync'
    : value.charAt(0).toUpperCase() + value.slice(1);

type Snapshot = {
  scope: string;
  errors: SyncError[];
  pending: number;
  activity?: ReturnType<typeof syncActivity.get>;
  processing: number;
};

export function SyncStatus() {
  const { token, user } = useAuth();
  const { activeShopId } = useShopMemberships(user?.id);
  const client = useQueryClient();
  const location = useLocation();
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [online, setOnline] = useState(navigator.onLine);
  const [opened, setOpened] = useState(false);
  const [localMessage, setLocalMessage] = useState('');
  const popup = useRef<HTMLElement>(null);
  const scopeKey =
    token && activeShopId ? scopeFor(token, activeShopId).key : null;
  useEffect(() => {
    setOpened(false);
    setLocalMessage('');
  }, [scopeKey]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!popup.current?.contains(event.target as Node)) setOpened(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpened(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  useEffect(() => {
    const clear = () => {
      client.clear();
      setSnapshot(undefined);
      setOpened(false);
    };
    window.addEventListener('neuton-account-change', clear);
    return () => window.removeEventListener('neuton-account-change', clear);
  }, [client]);
  useEffect(() => {
    if (!token || !activeShopId) return;
    const scope = scopeFor(token, activeShopId);
    let active = true;
    let refreshing = false;
    let documentVersion: string | undefined;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const [writes, scans, pulls, errors, documents] = await Promise.all([
          store.writes(scope.key),
          store.scans(scope.key),
          store.rows('pulls', scope.key),
          errorsFor(scope.key),
          store.documents(scope.key),
        ]);
        if (active)
          setSnapshot({
            scope: scope.key,
            errors: errors.filter((row) => row.state === 'unresolved'),
            pending: writes.length + scans.length + pulls.length,
            activity: syncActivity.get(scope.key),
            processing: documents.filter(
              (row) =>
                !row.localOnly &&
                ['pending', 'processing'].includes(String(row.data.status)),
            ).length,
          });
        const nextVersion = documents
          .map((row) => `${row.key}:${row.updatedAt}:${row.syncStatus}`)
          .join('|');
        if (
          active &&
          documentVersion !== undefined &&
          nextVersion !== documentVersion
        ) {
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
        }
        documentVersion = nextVersion;
      } catch {
        if (active) setLocalMessage('Storage unavailable');
      } finally {
        refreshing = false;
      }
    };
    const sync = () => {
      setOnline(navigator.onLine);
      void syncDocuments(scope, { token, shopId: activeShopId })
        .catch(() => undefined)
        .finally(() => {
          if (!active) return;
          void refresh();
        });
    };
    const unsubscribe = store.subscribe(() => {
      void refresh();
    });
    void refresh();
    sync();
    const displayTimer = window.setInterval(() => {
      void refresh();
    }, 1000);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    window.addEventListener('focus', sync);
    return () => {
      active = false;
      unsubscribe();
      clearInterval(displayTimer);
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      window.removeEventListener('focus', sync);
    };
  }, [token, activeShopId, client, location.pathname]);
  if (!token || !activeShopId) return null;
  const current = snapshot?.scope === scopeKey ? snapshot : undefined;
  const errors = current?.errors ?? [];
  const succeeded =
    current?.activity?.completedAt &&
    !current?.activity?.running &&
    Date.now() - current.activity.completedAt < 8000;
  if (!errors.length && online && !succeeded && !localMessage)
    return null;
  const tone = errors.length || localMessage || !online ? 'error' : 'success';
  const first = errors[0];
  const message =
    localMessage ||
    first?.message ||
    (!online
      ? 'Connection unavailable'
      : current?.activity?.message || 'Sync succeeded');
  const title = first
    ? `${label(first.entity)} · ${label(first.operation)}`
    : current?.activity
      ? `${label(current.activity.entity)} · ${label(current.activity.operation)}`
      : 'Sync';
  const retry = () => {
    setLocalMessage('');
    void syncDocuments(
      scopeFor(token, activeShopId),
      { token, shopId: activeShopId },
      { force: true },
    ).catch(() => undefined);
  };
  const exportPending = async () => {
    const scope = scopeFor(token, activeShopId);
    try {
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
        new Blob(
          [JSON.stringify({ documents, writes, scans, blobs: binary })],
          { type: 'application/json' },
        ),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'neuton-pending-work.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setLocalMessage('Export failed');
    }
  };
  return (
    <SyncPopup
      rootRef={popup}
      tone={tone}
      title={title}
      message={message}
      errors={errors}
      pending={current?.pending ?? 0}
      processing={current?.processing ?? 0}
      online={online}
      opened={opened}
      setOpened={setOpened}
      retry={retry}
      exportPending={exportPending}
      onSignIn={() => {
        void supabase?.auth.signOut();
      }}
    />
  );
}
