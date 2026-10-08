import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrderDetail, OrderStatus } from '../lib/api';
import { renderWithRouter } from '../test/render';

/**
 * A processing order rests in the detail sheet until a human hands it over, so
 * the sheet is the only place that move can happen. These tests pin that the
 * sheet offers the move to every shop member (no owner/admin gate), sends the
 * transition the server accepts, flips to delivered on success, and explains a
 * failed transition inline without losing the button.
 */

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  apiFetch: api.apiFetch,
}));

const state = vi.hoisted(() => ({ role: 'owner' as 'owner' | 'admin' | 'member' }));

vi.mock('../lib/supabase', () => {
  const shop = {
    id: 'shop-1',
    name: 'testShop',
    slug: 'test-shop',
    currency: 'USD',
    timezone: 'UTC',
    storeAddress: null,
    targetProfitMargin: '30',
    hourlyLaborCost: '0',
    deliveryBaseFee: '0',
    deliveryRatePerKm: '0',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  return {
    supabase: null,
    isSupabaseConfigured: false,
    useAuth: () => ({
      session: null,
      loading: false,
      user: { id: 'u1' },
      token: 'token-1',
    }),
    useShopMemberships: () => ({
      memberships: [{ shopId: 'shop-1', role: state.role, shops: shop }],
      activeShopId: 'shop-1',
      loading: false,
      error: null,
      setActiveShopId: vi.fn(),
      reload: vi.fn(),
    }),
    useCurrentShop: () => shop,
  };
});

const { OrderDetailPage } = await import('./OrderDetailPage');

function makeOrderDetail(status: OrderStatus): OrderDetail {
  return {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    shopId: 'shop-1',
    userId: 'u1',
    customerName: 'Maya C.',
    orderDate: '2026-09-28T10:00:00.000Z',
    destinationAddress: '123 Main St',
    deliveryDistanceKm: '5.00',
    deliveryFee: '10.00',
    appliedProfitMargin: '30.00',
    totalCost: '40.00',
    totalAmount: '62.12',
    documentUrl: null,
    status,
    netProfit: 22.12,
    createdAt: '2026-09-28T10:00:00.000Z',
    items: [
      {
        id: 'li-1',
        recipeId: 'r-1',
        name: 'Focaccia',
        quantity: '2.000',
        unitCost: '20.00',
        unitPrice: '31.06',
      },
    ],
  };
}

/** Answers GET /orders/:id from a status the transition mock can move forward. */
function mockApi() {
  const current = { status: 'processing' as OrderStatus };

  api.apiFetch.mockImplementation(async (path: string) => {
    if (path.endsWith('/status')) {
      current.status = 'delivered';
      // Like the real PATCH response, the transition carries the order row
      // without its items — the sheet must keep rendering the lines it has.
      const { items: _dropped, ...row } = makeOrderDetail('delivered');
      return { order: row };
    }
    return { order: makeOrderDetail(current.status) };
  });

  return current;
}

beforeEach(() => {
  api.apiFetch.mockReset();
  state.role = 'owner';
});

/** The sheet reads `:id` off the route, so it needs a real route to mount on. */
function renderDetail() {
  return renderWithRouter(
    <Routes>
      <Route path="/orders/:id" element={<OrderDetailPage />} />
    </Routes>,
    { route: '/orders/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
  );
}

describe('OrderDetailPage delivery', () => {
  it('shows the status badge in the header', async () => {
    mockApi();
    renderDetail();

    expect(await screen.findByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('Maya C.')).toBeInTheDocument();
  });

  it('offers the mark-delivered action on a processing order', async () => {
    mockApi();
    renderDetail();

    expect(await screen.findByRole('button', { name: 'Mark as delivered' })).toBeInTheDocument();
  });

  it('offers the action to members too, not just owners', async () => {
    state.role = 'member';
    mockApi();
    renderDetail();

    expect(await screen.findByRole('button', { name: 'Mark as delivered' })).toBeInTheDocument();
  });

  it('hides the action once the order is delivered', async () => {
    const current = mockApi();
    current.status = 'delivered';
    renderDetail();

    await screen.findByText('Delivered');
    expect(screen.queryByRole('button', { name: 'Mark as delivered' })).toBeNull();
  });

  it('sends the delivered transition and flips the sheet to delivered', async () => {
    const user = userEvent.setup();
    mockApi();
    renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Mark as delivered' }));

    await waitFor(() =>
      expect(api.apiFetch).toHaveBeenCalledWith(
        '/orders/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/status',
        expect.objectContaining({
          method: 'PATCH',
          shopId: 'shop-1',
          body: { status: 'delivered' },
        }),
      ),
    );
    // The sheet hands straight over to the delivered state: badge swapped, the
    // action gone, so the order cannot be delivered twice.
    expect(await screen.findByText('Delivered')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark as delivered' })).toBeNull();
    // The transition response carries no items, so the lines stay from state.
    expect(screen.getByText('Focaccia')).toBeInTheDocument();
  });

  it('keeps the button in place and explains a failed transition', async () => {
    const user = userEvent.setup();
    api.apiFetch.mockImplementation(async (path: string) => {
      if (path.endsWith('/status')) {
        throw new Error('Order is already delivered');
      }
      return { order: makeOrderDetail('processing') };
    });
    renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Mark as delivered' }));

    expect(await screen.findByText('Order is already delivered')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark as delivered' })).toBeInTheDocument();
  });
});
