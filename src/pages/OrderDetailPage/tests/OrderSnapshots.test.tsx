import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { authState, resetAuth } from '@/test/auth';
import { createTestQueryClient, renderWithRouter } from '@/test/render';
import { buildOrder } from '@/test/factories/order.factory';
import { apiPath } from '@/test/mocks/handlers/context';
import { server } from '@/test/mocks/server';
import { ordersKeys } from '@/features/orders/keys';
import { OrderDetailPage } from '../OrderDetailPage';

vi.mock('@/features/auth/auth', async () => (await import('@/test/auth')).authMock);
vi.mock('@/features/sync/documentsApi', async () => ({ documentFetch: (await import('@/lib/api')).apiFetch }));
beforeEach(resetAuth);
const snapshot = (deliveryDate: string | null | undefined, costComplete?: boolean | null) => ({
  ...buildOrder({ id: 'saved', deliveryFee: '0.00', totalAmount: '20.00', totalCost: '4.00', netProfit: 0 }),
  deliveryDistanceKm: '50.00', deliveryDate,
  items: [{ id: 'line', recipeId: 'deleted-recipe', name: 'Original recipe name', quantity: '1', unitPrice: '20.00', unitCost: '4.00', costComplete }],
});
function mount() {
  const queryClient = createTestQueryClient();
  const view = renderWithRouter(<Routes><Route path='/orders/:id' element={<OrderDetailPage />} /></Routes>, {
    route: '/orders/saved', queryClient,
  });
  return { ...view, queryClient };
}

it.each([null, undefined, '2028-02-29'])('uses the stored zero fee and only shows a known delivery date: %s', async deliveryDate => {
  authState.shop.deliveryBaseFee = '999.00';
  authState.shop.deliveryRatePerKm = '25.00';
  server.use(http.get(apiPath('/orders/saved'), () => HttpResponse.json({ order: snapshot(deliveryDate) })));
  mount();
  const delivery = (await screen.findByRole('heading', { name: 'Delivery' })).closest('section')!;
  expect(within(delivery).getByText('$0.00')).toBeInTheDocument();
  expect(screen.queryByText('Distance fee')).toBeNull();
  expect(screen.queryByText('Base fee')).toBeNull();
  expect(screen.queryByText(/\/ km/)).toBeNull();
  if (deliveryDate) {
    expect(within(delivery).getByText('Delivery date')).toBeInTheDocument();
    expect(within(delivery).getByText('Feb 29, 2028')).toBeInTheDocument();
  } else {
    expect(within(delivery).queryByText('Delivery date')).toBeNull();
  }
});

it('keeps saved names, selling amounts, fee and server profit when current shop/recipe data changes', async () => {
  const saved = snapshot('2028-02-29', false);
  const requests: string[] = [];
  server.use(http.get(apiPath('/orders/saved'), ({ request }) => { requests.push(request.url); return HttpResponse.json({ order: saved }); }));
  const { queryClient } = mount();
  expect(await screen.findByText('Original recipe name')).toBeInTheDocument();
  expect(screen.getByText('Partial cost')).toBeInTheDocument();
  expect(screen.getByText('Known production cost')).toBeInTheDocument();
  expect(screen.getByText('Profit $0.00')).toBeInTheDocument();
  expect(screen.getByText(/These items contribute no profit/)).toBeInTheDocument();
  authState.shop = { ...authState.shop, deliveryBaseFee: '999.00', deliveryRatePerKm: '99.00' };
  await act(() => queryClient.invalidateQueries({ queryKey: ordersKeys.order('shop-1', 'saved') }));
  await waitFor(() => expect(requests).toHaveLength(2));
  expect(screen.getByText('Original recipe name')).toBeInTheDocument();
  expect(screen.getByText('1 × $20.00')).toBeInTheDocument();
  expect(screen.getByText('Profit $0.00')).toBeInTheDocument();
  expect(screen.queryByText('$999.00')).toBeNull();
});

it.each([true, null, undefined])('does not relabel complete or historically unknown costing as partial: %s', async costComplete => {
  server.use(http.get(apiPath('/orders/saved'), () => HttpResponse.json({ order: snapshot(null, costComplete) })));
  mount();
  await screen.findByText('Original recipe name');
  expect(screen.queryByText('Partial cost')).toBeNull();
  expect(screen.queryByText('Known production cost')).toBeNull();
  expect(screen.getByText('Production cost')).toBeInTheDocument();
});
