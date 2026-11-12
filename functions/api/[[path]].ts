import { proxyApiRequest, type ProxyContext } from '../api-proxy';

export function onRequest(context: ProxyContext) {
  return proxyApiRequest(context);
}
