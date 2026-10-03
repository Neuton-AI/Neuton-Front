import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * `apiFetch` is the single seam every page talks through, and its error
 * contract is the one the whole Front reads. N-3 (the Back's misplaced
 * `setErrorHandler`) means the API currently emits two different shapes —
 * `{error:{code,message}}` and Fastify's `{statusCode,error,message}`. These
 * tests pin the *client's* tolerance for both so that fixing N-3 on the Back
 * cannot silently break the Front.
 */

function mockFetch(...responses: Response[]) {
  const fn = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
  for (const response of responses) fn.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fn);
  return fn;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

/**
 * The base URL is read from the environment once at module load, so a test that
 * cares about it has to re-import the module against a stubbed env.
 */
async function loadApi(env: Record<string, string> = {}) {
  vi.stubEnv('VITE_API_BASE_URL', env.VITE_API_BASE_URL ?? 'https://api.test');
  vi.resetModules();
  return import('./api');
}

describe('base URL', () => {
  it('prefixes the versioned API root onto the requested path', async () => {
    const { apiFetch } = await loadApi();
    const fetchMock = mockFetch(json({ ok: true }));

    await apiFetch('/receipts?limit=50');

    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/api/v1/receipts?limit=50');
  });

  it('strips a trailing slash so paths never double up', async () => {
    const { apiFetch } = await loadApi({ VITE_API_BASE_URL: 'https://api.test/' });
    const fetchMock = mockFetch(json({}));

    await apiFetch('/recipes');

    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/api/v1/recipes');
  });

  it('falls back to the local API when the env var is absent', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.resetModules();
    const { apiFetch } = await import('./api');
    const fetchMock = mockFetch(json({}));

    await apiFetch('/recipes');

    expect(fetchMock.mock.calls[0]![0]).toMatch(/\/api\/v1\/recipes$/);
  });
});

describe('apiFetch', () => {
  it('sends the auth context as a bearer token and the shop header', async () => {
    const { apiFetch } = await loadApi();
    const fetchMock = mockFetch(json({ ok: true }));

    await apiFetch('/receipts?limit=50', { token: 'jwt-123', shopId: 'shop-abc' });

    const init = fetchMock.mock.calls[0]![1];
    expect(init?.method).toBe('GET');
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer jwt-123',
      'x-shop-id': 'shop-abc',
    });
    // A GET with no body must not claim to be JSON.
    expect(init?.headers).not.toHaveProperty('Content-Type');
  });

  it('serialises the body and sets the content type only when there is one', async () => {
    const { apiFetch } = await loadApi();
    const fetchMock = mockFetch(json({ receiptId: 'r1' }));

    await apiFetch('/uploads/complete', { method: 'POST', body: { path: 'a/b.jpg' } });

    const init = fetchMock.mock.calls[0]![1];
    expect(init?.body).toBe('{"path":"a/b.jpg"}');
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('returns undefined for a 204 rather than trying to parse an empty body', async () => {
    const { apiFetch } = await loadApi();
    mockFetch(new Response(null, { status: 204 }));

    await expect(apiFetch('/receipts/r1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('returns the parsed payload on success', async () => {
    const { apiFetch } = await loadApi();
    mockFetch(json({ recipes: [{ id: 'x' }] }));

    await expect(apiFetch<{ recipes: { id: string }[] }>('/recipes')).resolves.toEqual({
      recipes: [{ id: 'x' }],
    });
  });

  describe('error contract', () => {
    it('reads the app shape {error:{code,message}}', async () => {
      const { apiFetch, ApiError } = await loadApi();
      mockFetch(json({ error: { code: 'NOT_FOUND', message: 'Receipt not found' } }, 404));

      const error = await apiFetch('/receipts/nope').catch((cause: unknown) => cause);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        name: 'ApiError',
        status: 404,
        code: 'NOT_FOUND',
        message: 'Receipt not found',
      });
    });

    it('also reads the default Fastify shape {statusCode,error,message}', async () => {
      // This is what the API emits today because of N-3. Once N-3 lands this
      // test should still pass: the client tolerates both, it just prefers the
      // app shape when it is present.
      const { apiFetch } = await loadApi();
      mockFetch(
        json(
          { statusCode: 401, code: 'UNAUTHORIZED', error: 'Unauthorized', message: 'Missing bearer token' },
          401,
        ),
      );

      await expect(apiFetch('/receipts')).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Missing bearer token',
      });
    });

    it('falls back to a string `error` field when there is no message', async () => {
      const { apiFetch } = await loadApi();
      mockFetch(json({ error: 'Forbidden' }, 403));

      await expect(apiFetch('/inventory')).rejects.toMatchObject({
        status: 403,
        message: 'Forbidden',
      });
    });

    it('never surfaces "[object Object]" for an unrecognised body', async () => {
      const { apiFetch } = await loadApi();
      mockFetch(json({ details: { reason: 'unknown' } }, 400));

      await expect(apiFetch('/recipes')).rejects.toMatchObject({
        message: 'Request failed (400)',
      });
    });

    it('survives a non-JSON body from a proxy instead of throwing SyntaxError', async () => {
      // An empty 502 or an HTML error page must not escape as a parse failure.
      const { apiFetch } = await loadApi();
      mockFetch(new Response('<html>502 Bad Gateway</html>', { status: 502 }));

      await expect(apiFetch('/analytics/dashboard')).rejects.toMatchObject({
        name: 'ApiError',
        status: 502,
        message: 'Request failed (502)',
      });
    });

    it('reports an unreachable server as a status-0 ApiError with actionable copy', async () => {
      const { apiFetch } = await loadApi();
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

      await expect(apiFetch('/receipts')).rejects.toMatchObject({
        name: 'ApiError',
        status: 0,
        message: 'Cannot reach the server. Check your connection and try again.',
      });
    });

    it('rethrows an AbortError unchanged so callers can ignore it', async () => {
      const { apiFetch } = await loadApi();
      const aborted = new DOMException('The operation was aborted', 'AbortError');
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(aborted));

      await expect(apiFetch('/receipts/r1')).rejects.toBe(aborted);
    });

    it('passes the abort signal through to fetch', async () => {
      const { apiFetch } = await loadApi();
      const fetchMock = mockFetch(json({}));
      const controller = new AbortController();

      await apiFetch('/receipts/r1', { signal: controller.signal });

      expect(fetchMock.mock.calls[0]![1]?.signal).toBe(controller.signal);
    });
  });
});

describe('ALLOWED_CONTENT_TYPES', () => {
  it('mirrors the backend upload allowlist', async () => {
    const { ALLOWED_CONTENT_TYPES } = await loadApi();

    expect([...ALLOWED_CONTENT_TYPES]).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'application/pdf',
    ]);
  });
});
