import type { Order } from '@/features/orders/types';
const sampleOrder: Order = {
  id: '1048',
  orderNumber: 1048,
  shopId: 'stub',
  userId: null,
  customerName: 'Maya C.',
  orderDate: '2026-09-28T10:00:00.000Z',
  destinationAddress: '123 Market St',
  deliveryDistanceKm: '0.00',
  deliveryFee: '0.00',
  appliedProfitMargin: null,
  totalCost: '40.00',
  totalAmount: '62.12',
  documentUrl: null,
  status: 'processing',
  netProfit: 22.12,
  createdAt: '2026-09-28T10:00:00.000Z',
};

export const buildOrder = (overrides: Partial<Order> = {}): Order => ({
  ...sampleOrder,
  ...overrides,
});
export const STUB_ORDER = buildOrder();
