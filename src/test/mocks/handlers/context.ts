import { HttpResponse } from 'msw';

/** Every handler rejects missing tenant/auth context instead of accepting a bad request. */
export function requireContext(request: Request) {
  if (request.headers.get('authorization') !== 'Bearer token-1')
    return HttpResponse.json({ error: { message: 'Missing credentials' } }, { status: 401 });
  if (request.headers.get('x-shop-id') !== 'shop-1')
    return HttpResponse.json({ error: { message: 'Missing shop' } }, { status: 403 });
  return null;
}
export const apiPath = (path: string) => `*/api/v1${path}`;
