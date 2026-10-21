/**
 * Typed API client for the Neuton Fastify backend.
 *
 * Auth is a Supabase JWT; the active shop travels in `x-shop-id` because the
 * API resolves shop membership server-side from that header.
 *
 * The Faro trace id travels as `x-trace-id` so a browser session, the API log
 * lines and any worker jobs it triggers share one correlation id. Faro is
 * optional: before it initializes (or if it fails) the backend simply starts a
 * fresh trace of its own.
 */

import { faro } from '@grafana/faro-web-sdk';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(
  /\/$/,
  '',
);

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  shopId?: string | null;
  signal?: AbortSignal;
  sync?: { id: string; updatedAt: number };
};

/**
 * The backend wraps every failure as `{ error: { code, message } }`. Flat
 * `{ message }` and bare-string `error` bodies are tolerated so a proxy or a
 * future endpoint change degrades to a real message instead of the string
 * `[object Object]`.
 */
function readError(payload: unknown, status: number): { message: string; code?: string } {
  const fallback = `Request failed (${status})`;
  if (typeof payload !== 'object' || payload === null) return { message: fallback };

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
  { method = 'GET', body, token, shopId, signal, sync }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (shopId) headers['x-shop-id'] = shopId;
  if (sync) {
    headers['x-sync-id'] = sync.id;
    headers['x-sync-version'] = String(sync.updatedAt);
  }
  const traceId = faro.api.getTraceContext()?.trace_id;
  if (traceId) headers['x-trace-id'] = traceId;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }

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

  if (!response.ok) {
    const { message, code } = readError(payload, response.status);
    throw new ApiError(message, response.status, code);
  }

  return payload as T;
}

export type { RequestOptions };
