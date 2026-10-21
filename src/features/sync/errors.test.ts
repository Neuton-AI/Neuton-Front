import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import {
  errorsFor,
  normalizeError,
  recordError,
  resolveErrors,
  type ErrorContext,
} from './errors';
import * as store from './store';

const scope = {
  userId: 'error-user',
  shopId: 'error-shop',
  key: 'error-user:error-shop',
};
const context: ErrorContext = {
  scope,
  entity: 'recipe',
  documentId: 'recipe-one',
  operation: 'edit',
  phase: 'push',
  operationId: 'mutation-one',
  revision: 10,
};
beforeEach(async () => {
  await store.transaction(['syncErrors'], (tx) => {
    tx.objectStore('syncErrors').clear();
  });
});

describe('safe sync error policy', () => {
  it.each([
    [
      new ApiError('secret server copy', 401),
      'session_expired',
      false,
      'Session expired',
    ],
    [
      new ApiError('secret server copy', 403),
      'permission_denied',
      false,
      'Permission denied',
    ],
    [
      new ApiError('secret server copy', 422),
      'validation',
      false,
      'Review document',
    ],
    [
      new ApiError('secret server copy', 400, 'INVALID_ADDRESS'),
      'validation',
      false,
      'Invalid address',
    ],
    [
      new ApiError('secret server copy', 409),
      'conflict',
      false,
      'Resolve conflict',
    ],
    [
      new ApiError('secret server copy', 429),
      'rate_limit',
      true,
      'Sync delayed',
    ],
    [
      new ApiError('secret server copy', 0),
      'network',
      true,
      'Connection failed',
    ],
    [
      new DOMException('deadline', 'TimeoutError'),
      'network',
      true,
      'Connection failed',
    ],
    [
      new ApiError('secret server copy', 503),
      'server',
      true,
      'Server unavailable',
    ],
    [
      new DOMException('disk', 'QuotaExceededError'),
      'storage',
      false,
      'Storage full',
    ],
    [new Error('secret server copy'), 'unknown', true, 'Sync failed'],
    [
      new ApiError('missing', 404),
      'missing_resource',
      false,
      'Document unavailable',
    ],
  ])(
    'classifies %s as %s with approved concise copy',
    (error, category, retryable, message) => {
      const record = normalizeError(error, context)!;
      expect(record).toMatchObject({
        entity: 'recipe',
        operation: 'edit',
        documentId: 'recipe-one',
        category,
        retryable,
        message,
      });
      expect(record.message.split(/\s+/)).toHaveLength(2);
      expect(record.message).not.toContain('secret');
      expect(record.technical.message).toBe(error.message);
    },
  );

  it('ignores cancellation and honors Retry-After above exponential backoff', () => {
    expect(
      normalizeError(new DOMException('cancel', 'AbortError'), context),
    ).toBeNull();
    const record = normalizeError(
      new ApiError('delayed', 429, undefined, 90_000),
      context,
    )!;
    expect(record.nextRetryAt! - record.lastOccurrence).toBe(90_000);
  });

  it('redacts credentials, signed URLs, document bodies and email addresses from scalar diagnostics', () => {
    const record = normalizeError(
      new ApiError(
        'Bearer very-secret https://storage.test/file?signature=secret email@example.com {"document":"private body"} token=secret',
        500,
        'SERVER',
        undefined,
        'trace-123',
      ),
      context,
    )!;
    const persisted = JSON.stringify(record);
    for (const secret of [
      'very-secret',
      'signature=secret',
      'email@example.com',
      'private body',
      'token=secret',
    ])
      expect(persisted).not.toContain(secret);
    expect(record.technical.traceId).toBe('trace-123');
    expect(record.technical.status).toBe(500);
  });

  it('persists deduplicated attempts, isolates scopes and resolves only matching revisions', async () => {
    await recordError(new ApiError('denied', 403), context);
    await recordError(new ApiError('denied', 403), context);
    await recordError(new ApiError('newer', 500), { ...context, revision: 11 });
    await recordError(new ApiError('other', 500), {
      ...context,
      entity: 'receipt',
      operation: 'verify',
      operationId: 'receipt-mutation',
    });
    expect(await errorsFor(scope.key)).toHaveLength(3);
    expect(
      (await errorsFor(scope.key)).find(
        (row) => row.revision === 10 && row.entity === 'recipe',
      )?.attempts,
    ).toBe(2);
    expect(await errorsFor('another-user:error-shop')).toEqual([]);
    const database = await store.database();
    expect(
      await store.result(
        database.transaction('syncErrors').objectStore('syncErrors').getAll(),
      ),
    ).toHaveLength(3);
    await resolveErrors(context);
    const unresolved = (await errorsFor(scope.key)).filter(
      (row) => row.state === 'unresolved',
    );
    expect(unresolved).toHaveLength(2);
    expect(unresolved.some((row) => row.revision === 11)).toBe(true);
    expect(
      unresolved.some(
        (row) => row.entity === 'receipt' && row.operation === 'verify',
      ),
    ).toBe(true);
  });

  it('does not persist an arbitrary object thrown by an API or storage library', () => {
    const record = normalizeError(
      { token: 'secret', document: { name: 'private' } },
      context,
    )!;
    expect(record.technical).toMatchObject({
      name: 'UnknownError',
      message: 'Unknown failure',
    });
    expect(JSON.stringify(record)).not.toContain('private');
  });
});
