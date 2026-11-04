import type { RequestOptions } from '@/lib/api';
import type { MediaKind } from '@/features/uploads/types';
import { identityPartition } from '@/features/auth/environment';

export type Kind = 'receipt' | 'recipe' | 'order';
export type Scope = {
  environment?: string;
  userId: string;
  shopId: string;
  key: string;
};
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

/** The server projection namespaces local data; only the cookie authorizes API access. */
export function scopeFor(
  identity: import('@/lib/queryTypes').AuthenticatedContext,
  shopId: string | null | undefined,
): Scope {
  if (!identity || !shopId) throw new Error('Sign in');
  const { environment, userId } = identity;
  return {
    environment,
    userId,
    shopId,
    key: `${identityPartition(identity)}:${shopId}`,
  };
}
