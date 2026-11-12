import { describe, expect, it, vi } from 'vitest';
import { proxyApiRequest } from './api-proxy';

function context(url: string, init: RequestInit = {}, upstream?: string) {
  return {
    request: new Request(url, init),
    env: { API_UPSTREAM: upstream },
  };
}

describe('Pages API proxy', () => {
  it('forwards the session check to the API and returns its response', async () => {
    const upstream = new Response(JSON.stringify({ error: { message: 'Missing session cookie' } }), {
      status: 401,
      headers: { 'content-type': 'application/json', 'set-cookie': '__Host-neuton-session=cleared; Secure; HttpOnly' },
    });
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(upstream);
    const response = await proxyApiRequest(context('https://neuton-front.pages.dev/api/v1/session', {
      headers: { cookie: 'neuton-csrf=proof', origin: 'https://neuton-front.pages.dev', host: 'neuton-front.pages.dev' },
    }), fetchImpl);

    expect(response).toBe(upstream);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [destination, init] = fetchImpl.mock.calls[0];
    expect(destination).toBeInstanceOf(URL);
    expect((destination as URL).href).toBe('https://neuton-back.onrender.com/api/v1/session');
    expect(init?.method).toBe('GET');
    expect(init?.redirect).toBe('manual');
    expect(init?.body).toBeUndefined();
    const headers = init?.headers as Headers;
    expect(headers.get('cookie')).toBe('neuton-csrf=proof');
    expect(headers.get('origin')).toBe('https://neuton-front.pages.dev');
    expect(headers.has('host')).toBe(false);
  });

  it('keeps the query string and request body on the way to a configured origin', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    await proxyApiRequest(context('https://neuton-front.pages.dev/api/v1/auth/signin?next=%2Fdashboard', {
      method: 'POST',
      body: '{"email":"a@b.co"}',
      headers: { 'content-type': 'application/json' },
    }, 'https://api.example.test'), fetchImpl);

    const [destination, init] = fetchImpl.mock.calls[0];
    const forwarded = init as RequestInit & { duplex?: 'half' };
    expect((destination as URL).href).toBe('https://api.example.test/api/v1/auth/signin?next=%2Fdashboard');
    expect(forwarded.method).toBe('POST');
    expect(forwarded.duplex).toBe('half');
    expect(await new Response(forwarded.body).text()).toBe('{"email":"a@b.co"}');
  });

  it('refuses an upstream that is not one HTTPS origin', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    for (const upstream of ['http://neuton-back.onrender.com', 'https://user:secret@api.example.test', 'https://api.example.test/api', 'not a url']) {
      const response = await proxyApiRequest(context('https://neuton-front.pages.dev/api/v1/session', {}, upstream), fetchImpl);
      expect(response.status).toBe(502);
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
