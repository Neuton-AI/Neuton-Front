const defaultUpstream = 'https://neuton-back.onrender.com';

export type ProxyContext = {
  request: Request;
  env: { API_UPSTREAM?: string };
};

function configuredOrigin(value: string | undefined): URL | null {
  const candidate = value && value.trim().length > 0 ? value.trim() : defaultUpstream;
  try {
    const target = new URL(candidate);
    const bareOrigin = target.protocol === 'https:' && target.username === '' && target.password === ''
      && target.pathname === '/' && target.search === '' && target.hash === '';
    return bareOrigin ? target : null;
  } catch {
    return null;
  }
}

function misconfigured(): Response {
  return new Response(JSON.stringify({
    error: { code: 'BAD_GATEWAY', message: 'API upstream is not configured' },
  }), {
    status: 502,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/**
 * Forwards `/api/*` to the Nest API while the browser stays on the Pages origin.
 * Returning the upstream response unchanged keeps `Set-Cookie` and the sync stream intact.
 */
export function proxyApiRequest(context: ProxyContext, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const target = configuredOrigin(context.env.API_UPSTREAM);
  if (!target) return Promise.resolve(misconfigured());

  const incoming = new URL(context.request.url);
  const destination = new URL(`${incoming.pathname}${incoming.search}`, target.origin);
  const headers = new Headers(context.request.headers);
  headers.delete('host');
  const method = context.request.method;
  const init: RequestInit & { duplex?: 'half' } = {
    method, headers, redirect: 'manual', signal: context.request.signal,
  };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = context.request.body;
    init.duplex = 'half';
  }
  return fetchImpl(destination, init);
}
