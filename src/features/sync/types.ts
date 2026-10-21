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
};
export type PendingWrite = {
  key: string;
  scope: string;
  documentKey: string;
  id: string;
  updatedAt: number;
  path: string;
  method: RequestOptions['method'];
  body?: unknown;
};
export type PendingScan = {
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

/** JWT subject namespaces local data; server authorization remains the API's responsibility. */
export function scopeFor(
  token: string | null | undefined,
  shopId: string | null | undefined,
): Scope {
  if (!token || !shopId)
    throw new Error('Sign in and select a shop to use saved documents.');
  const part = token.split('.')[1];
  const userId = part
    ? (
        JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as {
          sub?: string;
        }
      ).sub
    : undefined;
  if (!userId) throw new Error('Your session is invalid. Sign in again.');
  return { userId, shopId, key: `${userId}:${shopId}` };
}
