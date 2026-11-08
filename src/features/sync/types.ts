import type { RequestOptions } from '@/lib/api';
import type { MediaKind } from '@/features/uploads/types';

export type Kind = 'receipt' | 'recipe' | 'order';
export type Scope = { userId: string; shopId: string; key: string };
export type DocumentData = Record<string, unknown> & { id: string };
export type LocalDocument = {
  key: string;
  scope: string;
  kind: Kind;
  id: string;
  updatedAt: number;
  data: DocumentData;
  deleted: boolean;
  localOnly?: boolean;
  syncStatus: 'synced' | 'pending-push' | 'pending-pull';
  lastSyncedAt?: number;
  serverVersion?: number;
  serverData?: DocumentData;
  conflicts?: string[];
  remoteDeleted?: boolean;
};
export type PendingWrite = {
  operation?: import('./errors').Operation;
  key: string;
  scope: string;
  documentKey: string;
  id: string;
  updatedAt: number;
  path: string;
  method: RequestOptions['method'];
  body?: unknown;
  baseVersion?: number;
};
export type PendingScan = {
  upload?: {
    uploadId: string | null;
    receiptId: string | null;
    recipeId: string | null;
    sources: { sourceId: string | null; uploaded: boolean }[];
  };
  key: string;
  scope: string;
  documentKey: string;
  id: string;
  kind: MediaKind;
  orderId?: string;
  filenames: string[];
  createdAt: number;
};
export type PendingPull = {
  key: string;
  scope: string;
  kind: Kind;
  id: string;
  updatedAt: number;
  deleted?: boolean;
};
export const documentKey = (scope: Scope, kind: Kind, id: string) =>
  `${scope.key}:${kind}:${id}`;

/** Preserve the existing partition using the server-confirmed account and shop IDs. */
export function scopeFor(
  userId: string | null | undefined,
  shopId: string | null | undefined,
): Scope {
  if (!userId || !shopId) throw new Error('Sign in');
  return { userId, shopId, key: `${userId}:${shopId}` };
}
