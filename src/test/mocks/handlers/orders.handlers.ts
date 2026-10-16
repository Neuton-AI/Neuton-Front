import type { OrderableRecipe, OrderQuote } from '@/features/orders/types';
import { buildOrder } from '@/test/factories/order.factory';
import { http, HttpResponse } from 'msw';
import { apiPath, requireContext } from './context';

export const buildOrderableRecipe = (
  overrides: Partial<OrderableRecipe> = {},
): OrderableRecipe => ({
  id: 'rp-1',
  name: 'Soup',
  imageUrl: null,
  yieldQuantity: '4',
  yieldUnit: 'servings',
  unitCost: 6,
  retailPrice: 10,
  ...overrides,
});
export const buildQuote = (overrides: Partial<OrderQuote> = {}): OrderQuote => ({
  items: [],
  deliveryDistanceKm: 0,
  baseFee: 2,
  ratePerKm: 1,
  totalCost: 6,
  totalAmount: 12,
  deliveryFee: 2,
  netProfit: 6,
  profitMarginPercent: 50,
  ...overrides,
});
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
  http.get(
    apiPath('/recipes/orderable'),
    ({ request }) =>
      requireContext(request) ?? HttpResponse.json({ recipes: [buildOrderableRecipe()] }),
  ),
  http.post(
    apiPath('/orders/quote'),
    ({ request }) => requireContext(request) ?? HttpResponse.json(buildQuote()),
  ),
  http.post(
    apiPath('/orders'),
    ({ request }) =>
      requireContext(request) ??
      HttpResponse.json({ order: buildOrder({ id: 'new-order' }), totals: { netProfit: 6 } }),
  ),
];
