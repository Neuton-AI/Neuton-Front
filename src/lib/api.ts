/**
 * Typed API client for the Neuton Fastify backend.
 *
 * Auth uses HttpOnly cookies; the active shop travels in `x-shop-id` because the
 * API resolves shop membership server-side from that header.
 *
 * The Faro trace id travels as `x-trace-id` so a browser session, the API log
 * lines and any worker jobs it triggers share one correlation id. Faro is
 * optional: before it initializes (or if it fails) the backend simply starts a
 * fresh trace of its own.
 */

import { faro } from '@grafana/faro-web-sdk';
import { ApiError } from './api-error';
export { ApiError } from './api-error';
import { apiOrigin, beginApiRequest, type AuthIdentity } from './api-context';
import { getCsrfToken, resetCsrf } from '@/features/auth/csrf';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  identity?: AuthIdentity | null;
  expectedUserId?: string;
  shopId?: string | null;
  signal?: AbortSignal;
  syncSnapshot?: boolean;
  sync?: { id: string; updatedAt: number; baseVersion?: number };
};

/**
 * The backend wraps every failure as `{ error: { code, message } }`. Flat
 * `{ message }` and bare-string `error` bodies are tolerated so a proxy or a
 * future endpoint change degrades to a real message instead of the string
 * `[object Object]`.
 */
function readError(
  payload: unknown,
  status: number,
): { message: string; code?: string } {
  const fallback = `Request failed (${status})`;
  if (typeof payload !== 'object' || payload === null) {
    return { message: fallback };
  }

  const top = payload as { message?: unknown; error?: unknown; code?: unknown };
  const topCode = typeof top.code === 'string' ? top.code : undefined;

  if (typeof top.message === 'string' && top.message.length > 0) {
    return { message: top.message, code: topCode };
  }
  if (typeof top.error === 'string' && top.error.length > 0) {
    return { message: top.error, code: topCode };
  }
  if (typeof top.error === 'object' && top.error !== null) {
    const nested = top.error as { message?: unknown; code?: unknown };
    if (typeof nested.message === 'string' && nested.message.length > 0) {
      return {
        message: nested.message,
        code: typeof nested.code === 'string' ? nested.code : topCode,
      };
    }
  }
  return { message: fallback };
}

export async function apiFetch<T>(
  path: string,
  {
    method = 'GET',
    body,
    identity,
    expectedUserId,
    shopId,
    signal,
    sync,
    syncSnapshot,
  }: RequestOptions = {},
): Promise<T> {
  const activeRequest = beginApiRequest(identity, signal, shopId);
  try {
    activeRequest.assertCurrent();
    if (identity && (identity.offline || !navigator.onLine)) {
      throw new ApiError(
        'Connection required. Your saved work is kept on this device.',
        0,
      );
    }
    if (identity?.expiresAt !== undefined && identity.expiresAt <= Date.now()) {
      window.dispatchEvent(new Event('neuton-shop-access-lost'));
      throw new ApiError(
        'Session expired. Sign in again to sync your saved work.',
        401,
      );
    }
    const headers: Record<string, string> = {};
    if (body !== undefined || method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }
    if (method !== 'GET') headers['x-csrf-token'] = await getCsrfToken();
    activeRequest.assertCurrent();

    if (shopId) headers['x-shop-id'] = shopId;
    const clientUserId = expectedUserId ?? identity?.userId;
    if (clientUserId) headers['x-client-user-id'] = clientUserId;
    if (syncSnapshot) headers['x-sync-snapshot'] = 'true';
    if (sync) {
      headers['x-sync-id'] = sync.id;
      headers['x-sync-version'] = String(sync.updatedAt);
      if (sync.baseVersion !== undefined) {
        headers['x-sync-base-version'] = String(sync.baseVersion);
      }
    }
    const traceId = faro.api.getTraceContext()?.trace_id;
    if (traceId) headers['x-trace-id'] = traceId;

    let response: Response;
    try {
      response = await fetch(`${apiOrigin()}/api/v1${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: activeRequest.signal,
        credentials: 'include',
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      throw new ApiError(
        'Cannot reach the server. Check your connection and try again.',
        0,
      );
    }

    activeRequest.assertCurrent();
    if (response.status === 204) return undefined as T;

    // A non-JSON body (HTML from a proxy, empty 502) must not throw out of
    // JSON.parse, which would surface as an unhandled SyntaxError.
    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    activeRequest.assertCurrent();
    if (!response.ok) {
      if (response.status === 403) resetCsrf();
      if (response.status === 403 && shopId) {
        window.dispatchEvent(
          new CustomEvent('neuton-shop-access-lost', { detail: shopId }),
        );
      }
      const { message, code } = readError(payload, response.status);
      if ((response.status === 401 && identity) || code === 'ACCOUNT_CHANGED') {
        resetCsrf();
        window.dispatchEvent(new Event('neuton-shop-access-lost'));
      }
      const retryAfter = response.headers.get('Retry-After');
      const seconds = retryAfter === null ? NaN : Number(retryAfter);
      let retryAfterMs: number | undefined;
      if (retryAfter !== null) {
        retryAfterMs = Math.max(0, Date.parse(retryAfter) - Date.now());
        if (Number.isFinite(seconds)) {
          retryAfterMs = Math.max(0, seconds * 1000);
        }
      }
      throw new ApiError(
        message,
        response.status,
        code,
        Number.isFinite(retryAfterMs) ? retryAfterMs : undefined,
        response.headers.get('x-trace-id') ?? traceId,
      );
    }

    return payload as T;
  } finally {
    activeRequest.dispose();
  }
}

export type { RequestOptions };
