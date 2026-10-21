import { ApiError } from '@/lib/api';
import * as store from './store';
import type { Kind, PendingWrite, Scope } from './types';

export type Operation =
  | 'create'
  | 'edit'
  | 'verify'
  | 'delete'
  | 'upload'
  | 'pull'
  | 'metadata-check';
export type ErrorContext = {
  scope: Scope;
  entity: Kind | 'product' | 'sync';
  documentId: string | null;
  operation: Operation;
  phase:
    | 'local-persistence'
    | 'metadata-check'
    | 'presign'
    | 'storage-put'
    | 'completion'
    | 'processing'
    | 'push'
    | 'pull';
  operationId: string;
  revision: number;
  sourceId?: string | null;
  sourceIndex?: number | null;
  savedLocally?: boolean;
};
export type Category =
  | 'session_expired'
  | 'permission_denied'
  | 'validation'
  | 'conflict'
  | 'rate_limit'
  | 'network'
  | 'server'
  | 'storage'
  | 'missing_resource'
  | 'unknown';
export type Recovery =
  | 'sign-in'
  | 'request-access'
  | 'review-document'
  | 'resolve-conflict'
  | 'retry'
  | 'export';
export type SyncError = Omit<ErrorContext, 'scope' | 'savedLocally'> & {
  savedLocally: boolean | null;
  key: string;
  scope: string;
  userId: string;
  shopId: string;
  category: Category;
  retryable: boolean;
  recovery: Recovery;
  messageKey: string;
  message: string;
  technical: {
    name: string;
    message: string;
    status: number | null;
    code: string | null;
    traceId: string | null;
  };
  firstOccurrence: number;
  lastOccurrence: number;
  attempts: number;
  nextRetryAt: number | null;
  state: 'unresolved' | 'resolved' | 'superseded';
};

const policy: Record<
  Category,
  { message: string; recovery: Recovery; retryable: boolean }
> = {
  session_expired: {
    message: 'Session expired',
    recovery: 'sign-in',
    retryable: false,
  },
  permission_denied: {
    message: 'Permission denied',
    recovery: 'request-access',
    retryable: false,
  },
  validation: {
    message: 'Review document',
    recovery: 'review-document',
    retryable: false,
  },
  conflict: {
    message: 'Resolve conflict',
    recovery: 'resolve-conflict',
    retryable: false,
  },
  rate_limit: { message: 'Sync delayed', recovery: 'retry', retryable: true },
  network: { message: 'Connection failed', recovery: 'retry', retryable: true },
  server: { message: 'Server unavailable', recovery: 'retry', retryable: true },
  storage: {
    message: 'Storage unavailable',
    recovery: 'export',
    retryable: false,
  },
  missing_resource: {
    message: 'Document unavailable',
    recovery: 'review-document',
    retryable: false,
  },
  unknown: { message: 'Sync failed', recovery: 'retry', retryable: true },
};
const approvedCodes: Record<string, string> = {
  SYNC_REQUIRED: 'Sync required',
  VERIFIED_RECEIPT: 'Deletion unavailable',
  INVALID_ADDRESS: 'Invalid address',
  ADDRESS_OUT_OF_RANGE: 'Address unsupported',
  RECEIPT_ALREADY_VERIFIED: 'Already verified',
  INVALID_STATUS: 'Invalid status',
  UNSUPPORTED_CONTENT_TYPE: 'Unsupported format',
  FILE_TOO_LARGE: 'File oversized',
  PROCESSING_FAILED: 'Scan failed',
};

/** Restrict diagnostics to scalar fields, redacting URLs, credentials and quoted payloads. */
export function redact(value: string): string {
  return value
    .replace(/https?:\/\/[^\s]+/gi, '[url]')
    .replace(/Bearer\s+\S+/gi, '[credential]')
    .replace(/\beyJ[\w-]+\.[\w-]+(?:\.[\w-]+)?/g, '[credential]')
    .replace(
      /(?:token|password|secret|authorization|cookie|api[_-]?key)\s*[:=]\s*\S+/gi,
      '[credential]',
    )
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
    .replace(/\{[\s\S]*\}|"[^"]*"|'[^']*'/g, '[data]')
    .slice(0, 300);
}
export const errorKey = (context: ErrorContext) =>
  JSON.stringify([
    context.scope.key,
    context.entity,
    context.documentId,
    context.operation,
    context.operationId,
    context.revision,
    context.phase,
    context.sourceIndex ?? null,
  ]);

export function normalizeError(
  error: unknown,
  context: ErrorContext,
  previous?: SyncError,
): SyncError | null {
  if (
    (error instanceof Error || error instanceof DOMException) &&
    error.name === 'AbortError'
  )
    return null;
  const api = error instanceof ApiError ? error : undefined;
  const status = api?.status;
  let category: Category = 'unknown';
  if (
    (context.phase === 'local-persistence' && !api) ||
    ((error instanceof Error || error instanceof DOMException) &&
      ['QuotaExceededError', 'InvalidStateError', 'NotFoundError'].includes(
        error.name,
      ))
  )
    category = 'storage';
  else if (status === 401) category = 'session_expired';
  else if (status === 403) category = 'permission_denied';
  else if (status === 409) category = 'conflict';
  else if (status === 429) category = 'rate_limit';
  else if (status === 404) category = 'missing_resource';
  else if (status === 408) category = 'network';
  else if (status !== undefined && status >= 400 && status < 500)
    category = 'validation';
  else if (
    status === 0 ||
    error instanceof TypeError ||
    ((error instanceof Error || error instanceof DOMException) &&
      error.name === 'TimeoutError')
  )
    category = 'network';
  else if (status !== undefined && status >= 500) category = 'server';
  const selected = policy[category];
  const now = Date.now();
  const attempts = (previous?.attempts ?? 0) + 1;
  const message =
    category === 'validation' && api?.code && approvedCodes[api.code]
      ? approvedCodes[api.code]
      : (error instanceof Error || error instanceof DOMException) &&
          error.name === 'QuotaExceededError'
        ? 'Storage full'
        : selected.message;
  return {
    ...context,
    savedLocally: context.savedLocally ?? null,
    sourceId: context.sourceId ?? null,
    sourceIndex: context.sourceIndex ?? null,
    key: errorKey(context),
    scope: context.scope.key,
    userId: context.scope.userId,
    shopId: context.scope.shopId,
    category,
    ...selected,
    message,
    messageKey: `sync.${category}.${api?.code && approvedCodes[api.code] ? api.code : 'default'}`,
    technical: {
      name:
        error instanceof Error || error instanceof DOMException
          ? redact(error.name)
          : 'UnknownError',
      message:
        error instanceof Error || error instanceof DOMException
          ? redact(error.message)
          : 'Unknown failure',
      status: status ?? null,
      code: api?.code ? redact(api.code) : null,
      traceId:
        api?.traceId && /^[\w-]{1,100}$/.test(api.traceId) ? api.traceId : null,
    },
    firstOccurrence: previous?.firstOccurrence ?? now,
    lastOccurrence: now,
    attempts,
    nextRetryAt: selected.retryable
      ? now +
        Math.max(
          Math.min(300_000, 1000 * 2 ** Math.min(attempts, 8)),
          api?.retryAfterMs ?? 0,
        )
      : null,
    state: 'unresolved',
  };
}

// If IndexedDB itself fails, retain safe feedback for this session without claiming durability.
const fallback = new Map<string, SyncError>();
export async function errorsFor(scope: string): Promise<SyncError[]> {
  let persisted: SyncError[] = [];
  try {
    persisted = await store.rows<SyncError>('syncErrors', scope);
  } catch {
    /* Storage recovery uses the session fallback. */
  }
  return [
    ...new Map(
      [...persisted, ...fallback.values()]
        .filter((row) => row.scope === scope)
        .map((row) => [row.key, row]),
    ).values(),
  ];
}
export async function recordError(error: unknown, context: ErrorContext) {
  const previous = (await errorsFor(context.scope.key)).find(
    (row) => row.key === errorKey(context),
  );
  const record = normalizeError(error, context, previous);
  if (!record) return;
  try {
    await store.transaction(['syncErrors'], (tx) => {
      tx.objectStore('syncErrors').put(record);
    });
    fallback.delete(record.key);
  } catch {
    fallback.set(record.key, record);
  }
  store.changed();
}
export async function resolveErrors(
  context: ErrorContext,
  state: 'resolved' | 'superseded' = 'resolved',
) {
  const matches = (await errorsFor(context.scope.key)).filter(
    (row) =>
      row.operationId === context.operationId &&
      row.revision === context.revision &&
      row.state === 'unresolved',
  );
  if (!matches.length) return;
  try {
    await store.transaction(['syncErrors'], (tx) => {
      for (const row of matches)
        tx.objectStore('syncErrors').put({ ...row, state });
    });
    for (const row of matches) fallback.delete(row.key);
  } catch {
    for (const row of matches) fallback.set(row.key, { ...row, state });
  }
  store.changed();
}
export async function pruneErrors(scope: string) {
  const resolved = (await errorsFor(scope))
    .filter((row) => row.state !== 'unresolved')
    .sort((a, b) => b.lastOccurrence - a.lastOccurrence);
  if (resolved.length <= 30) return;
  await store.transaction(['syncErrors'], (tx) => {
    for (const row of resolved.slice(30)) {
      tx.objectStore('syncErrors').delete(row.key);
      fallback.delete(row.key);
    }
  });
}
export async function supersedeLocalErrors(context: ErrorContext) {
  for (const row of await errorsFor(context.scope.key)) {
    if (
      row.state === 'unresolved' &&
      row.phase === 'local-persistence' &&
      row.entity === context.entity &&
      row.documentId === context.documentId &&
      row.operation === context.operation &&
      row.revision <= context.revision
    ) {
      await resolveErrors(
        {
          ...row,
          savedLocally: row.savedLocally ?? undefined,
          scope: context.scope,
        },
        'superseded',
      );
    }
  }
}
export function writeContext(scope: Scope, write: PendingWrite): ErrorContext {
  const [collection, id, action] = write.path.slice(1).split('/');
  return {
    scope,
    entity:
      collection === 'receipts'
        ? 'receipt'
        : collection === 'orders'
          ? 'order'
          : 'recipe',
    documentId: id ?? null,
    operation:
      write.operation ??
      (action === 'verify'
        ? 'verify'
        : write.method === 'DELETE'
          ? 'delete'
          : write.method === 'POST' && !action
            ? 'create'
            : 'edit'),
    phase: 'push',
    savedLocally: true,
    operationId: write.id,
    revision: write.updatedAt,
  };
}
