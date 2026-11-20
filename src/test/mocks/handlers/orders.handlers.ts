import { buildOrder } from '@/test/factories/order.factory';
import { http, HttpResponse } from 'msw';
import { apiPath, requireContext } from './context';

export const ordersHandlers = [
  http.get(
    apiPath('/orders'),
    ({ request }) => requireContext(request) ?? HttpResponse.json({ orders: [], total: 0 }),
  ),
  http.get(
    apiPath('/orders/:id'),
    ({ request, params }) =>
      requireContext(request) ??
      HttpResponse.json({ order: { ...buildOrder({ id: String(params.id) }), items: [] } }),
  ),
  http.post(
    apiPath('/orders'),
    ({ request }) =>
      requireContext(request) ??
      HttpResponse.json({ order: buildOrder({ id: 'new-order' }), totals: { netProfit: 6 } }),
  ),
];
