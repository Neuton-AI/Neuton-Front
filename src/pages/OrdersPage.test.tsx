import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '../lib/api';
import { renderWithRouter } from '../test/render';

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  apiFetch: api.apiFetch,
}));

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
      memberships: [{ shopId: 'shop-1', role: 'owner', shops: shop }],
      activeShopId: 'shop-1',
      loading: false,
      error: null,
      setActiveShopId: vi.fn(),
      reload: vi.fn(),
    }),
    useCurrentShop: () => shop,
  };
});

const { OrdersPage } = await import('./OrdersPage');

const sampleOrders: Order[] = [
  {
    id: '1048-abcd-1234',
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
    status: 'processing',
    netProfit: 22.12,
    createdAt: '2026-09-28T10:00:00.000Z',
  },
  {
    id: '1047-efgh-5678',
    shopId: 'shop-1',
    userId: 'u1',
    customerName: 'Daniel G.',
    orderDate: '2026-09-27T14:30:00.000Z',
    destinationAddress: '456 Oak Ave',
    deliveryDistanceKm: '2.00',
    deliveryFee: '5.00',
    appliedProfitMargin: '30.00',
    totalCost: '80.00',
    totalAmount: '128.00',
    documentUrl: null,
    status: 'delivered',
    netProfit: 48.0,
    createdAt: '2026-09-27T14:30:00.000Z',
  },
];

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Brilliant header with brand eyebrow and title, without redundant top plus button', async () => {
    api.apiFetch.mockResolvedValueOnce({ orders: sampleOrders, total: 2 });
    renderWithRouter(<OrdersPage />);

    expect(screen.getByText('YOUR SALES')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Orders' })).toBeInTheDocument();
    // Header should not contain a top right plus action button
    expect(screen.queryByRole('link', { name: 'New order' })).toBeNull();
  });

  it('renders order cards aligned with Brilliant component specifications', async () => {
    api.apiFetch.mockResolvedValueOnce({ orders: sampleOrders, total: 2 });
    renderWithRouter(<OrdersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Maya C\. · #1048/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Daniel G\. · #1047/)).toBeInTheDocument();
    expect(screen.getByText('Sep 28, 2026')).toBeInTheDocument();
    expect(screen.getByText('Sep 27, 2026')).toBeInTheDocument();
    expect(screen.getByText('$62.12')).toBeInTheDocument();
    expect(screen.getByText('$128.00')).toBeInTheDocument();

    const orderLinks = screen.getAllByRole('link');
    const mayaLink = orderLinks.find((link) =>
      link.getAttribute('href')?.includes('1048-abcd-1234'),
    );
    expect(mayaLink).toBeDefined();
  });

  it('renders the bottom CTA Add New Order button alongside the FAB above the bottom nav', async () => {
    api.apiFetch.mockResolvedValueOnce({ orders: sampleOrders, total: 2 });
    renderWithRouter(<OrdersPage />);

    const ctaButton = screen.getByRole('link', { name: 'Add New Order' });
    expect(ctaButton).toBeInTheDocument();
    expect(ctaButton).toHaveAttribute('href', '/orders/new');

    const fabTrigger = screen.getByRole('button', { name: 'Open actions' });
    expect(fabTrigger).toBeInTheDocument();
  });

  it('renders empty state matching Brilliant design when no orders exist', async () => {
    api.apiFetch.mockResolvedValueOnce({ orders: [], total: 0 });
    renderWithRouter(<OrdersPage includeStub={false} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'No orders yet' })).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        'Log your first sale to start tracking revenue, delivery fees and profit per order.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Tap Add New Order below')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add New Order' })).toBeInTheDocument();
  });

  it('shows a status badge per row', async () => {
    const { within } = await import('@testing-library/react');
    api.apiFetch.mockResolvedValueOnce({ orders: sampleOrders, total: 2 });
    renderWithRouter(<OrdersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Maya C\. · #1048/)).toBeInTheDocument();
    });

    // The filter tabs reuse the same words, so scope the badge query to the rows.
    const mayaRow = screen.getByText(/Maya C\. · #1048/).closest('a')!;
    const danielRow = screen.getByText(/Daniel G\. · #1047/).closest('a')!;
    expect(within(mayaRow).getByText('Processing')).toBeInTheDocument();
    expect(within(danielRow).getByText('Delivered')).toBeInTheDocument();
  });

  it('filters by status through the server query, defaulting to all', async () => {
    const user = userEvent.setup();
    api.apiFetch.mockResolvedValue({ orders: sampleOrders, total: 2 });
    renderWithRouter(<OrdersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Maya C\. · #1048/)).toBeInTheDocument();
    });

    // Default shows all without a status param.
    expect(api.apiFetch).toHaveBeenCalledWith(
      '/orders?limit=100',
      expect.objectContaining({ shopId: 'shop-1' }),
    );

    await user.click(screen.getByRole('tab', { name: 'Delivered' }));

    await waitFor(() => {
      expect(api.apiFetch).toHaveBeenCalledWith(
        '/orders?limit=100&status=delivered',
        expect.objectContaining({ shopId: 'shop-1' }),
      );
    });
  });
});
