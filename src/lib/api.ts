/**
 * Typed API client for the Neuton backend.
 *
 * Auth uses same-origin cookies; the active shop travels in `x-shop-id` because the
 * API resolves shop membership server-side from that header.
 *
 * The Faro trace id travels as `x-trace-id` so a browser session, the API log
 * lines and any worker jobs it triggers share one correlation id. Faro is
 * optional: before it initializes (or if it fails) the backend simply starts a
 * fresh trace of its own.
 */

import { faro } from '@grafana/faro-web-sdk';

const API_BASE_URL = '/api/v1';
let csrf: Promise<string> | undefined;
let userId: string | null | undefined;
let sessionId: string | null = null;
let shopId: string | null | undefined;
let account = new AbortController();
let shop = new AbortController();
let onSessionFailure: ((status: number) => void) | undefined;

export function resetCsrf() { csrf = undefined; }

export function setRequestSession(nextUserId: string | null, nextSessionId: string | null, onFailure: (status: number) => void) {
  account.abort();
  account = new AbortController();
  userId = nextUserId;
  sessionId = nextSessionId;
  onSessionFailure = onFailure;
  resetCsrf();
}

export function setRequestShop(nextShopId: string | null) {
  if (nextShopId === shopId) return;
  shop.abort();
  shop = new AbortController();
  shopId = nextShopId;
}

function csrfProof() {
  if (csrf) return csrf;
  const bootstrap = () => apiFetch<{ token: string }>('/auth/csrf', { method: 'POST' }).then(({ token }) => token);
  // Serialize initial cookie creation across tabs when the browser supports Web Locks.
  const pending = navigator.locks ? Promise.resolve(navigator.locks.request('neuton-csrf-bootstrap', bootstrap)) : bootstrap();
  csrf = pending;
  void pending.catch(() => { if (csrf === pending) resetCsrf(); });
  return pending;
}

export function requestScopeSignal(owner?: string | null, targetShop?: string | null, signal?: AbortSignal) {
  if ((owner && userId !== undefined && owner !== userId) || (targetShop && shopId !== undefined && targetShop !== shopId)) {
    throw new DOMException('The request scope changed', 'AbortError');
  }
  const signals = [signal, owner || targetShop ? account.signal : undefined, targetShop ? shop.signal : undefined]
    .filter((item): item is AbortSignal => Boolean(item));
  return signals.length > 1 ? AbortSignal.any(signals) : signals[0];
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly retryAfterMs?: number,
    readonly traceId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  userId?: string | null;
  sessionId?: string | null;
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
  if (typeof payload !== 'object' || payload === null)
    return { message: fallback };

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
  options: RequestOptions = {},
): Promise<T> {
  try {
    return await send<T>(path, options);
  } catch (error) {
    if (!['/auth/signin', '/auth/signup'].includes(path) || !(error instanceof ApiError) || error.status !== 403 ||
      !['Invalid CSRF proof', 'Browser context expired'].includes(error.message)) throw error;
    resetCsrf();
    return send<T>(path, options);
  }
}

async function send<T>(path: string, { method = 'GET', body, userId: owner, sessionId: expectedSession, shopId: targetShop, signal, sync, syncSnapshot }: RequestOptions): Promise<T> {
  const scoped = Boolean(owner || targetShop);
  const abortSignal = requestScopeSignal(owner, targetShop, signal);
  abortSignal?.throwIfAborted();
  const headers: Record<string, string> = {};
  const reference = expectedSession ?? (scoped ? sessionId : null);
  if (reference) headers['X-Session-Id'] = reference;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && path !== '/auth/csrf') headers['X-CSRF-Token'] = await csrfProof();
  abortSignal?.throwIfAborted();
  if (targetShop) headers['x-shop-id'] = targetShop;
  if (syncSnapshot) headers['x-sync-snapshot'] = 'true';
  if (sync) {
    headers['x-sync-id'] = sync.id;
    headers['x-sync-version'] = String(sync.updatedAt);
    if (sync.baseVersion !== undefined)
      headers['x-sync-base-version'] = String(sync.baseVersion);
  }
  const traceId = faro.api.getTraceContext()?.trace_id;
  if (traceId) headers['x-trace-id'] = traceId;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: abortSignal,
      credentials: 'same-origin',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw error;
    throw new ApiError(
      'Cannot reach the server. Check your connection and try again.',
      0,
    );
  }

  abortSignal?.throwIfAborted();
  if (response.status === 204) return undefined as T;

  // A non-JSON body (HTML from a proxy, empty 502) must not throw out of
  // JSON.parse, which would surface as an unhandled SyntaxError.
  const text = await response.text();
  abortSignal?.throwIfAborted();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (scoped && (response.status === 401 || response.status === 503)) onSessionFailure?.(response.status);
    const { message, code } = readError(payload, response.status);
    const retryAfter = response.headers.get('Retry-After');
    const seconds = retryAfter === null ? NaN : Number(retryAfter);
    const retryAfterMs =
      retryAfter === null
        ? undefined
        : Number.isFinite(seconds)
          ? Math.max(0, seconds * 1000)
          : Math.max(0, Date.parse(retryAfter) - Date.now());
    throw new ApiError(
      message,
      response.status,
      code,
      Number.isFinite(retryAfterMs) ? retryAfterMs : undefined,
      response.headers.get('x-trace-id') ?? traceId,
    );
  }

  return payload as T;
}

export type { RequestOptions };
