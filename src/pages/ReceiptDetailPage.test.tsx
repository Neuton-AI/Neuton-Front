import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReceiptDetail, ReceiptStatus } from '../lib/api';
import { renderWithRouter } from '../test/render';

/**
 * The worker hands an extracted receipt over as `unverified` and stops, so the
 * detail sheet is the only place a human can move it the rest of the way. These
 * tests pin that the sheet offers that move to the people allowed to make it
 * (owner/admin), sends every extracted line as accepted, and stops offering it
 * once the receipt is verified.
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

const { ReceiptDetailPage } = await import('./ReceiptDetailPage');

function makeReceiptDetail(status: ReceiptStatus): ReceiptDetail {
  return {
    id: 'rc-1',
    shopId: 'shop-1',
    uploadedBy: 'u1',
    storagePath: 'receipts/rc-1.png',
    contentType: 'image/png',
    originalFilename: 'rc-1.png',
    merchantName: 'Corner Market',
    receiptDate: '2026-02-10',
    totalAmount: '42.50',
    taxAmount: '3.20',
    currency: 'USD',
    status,
    rawExtraction: null,
    errorMessage: null,
    processedAt: null,
    createdAt: '2026-02-10T09:00:00.000Z',
    updatedAt: '2026-02-10T09:00:00.000Z',
    items: [
      {
        id: 'li-1',
        shopId: 'shop-1',
        receiptId: 'rc-1',
        inventoryItemId: status === 'verified' ? 'inv-1' : null,
        rawName: 'Flour',
        quantity: '2',
        unitPrice: '1.50',
        totalPrice: '3.00',
        unit: 'kg',
        confidence: '0.92',
        createdAt: '2026-02-10T09:00:00.000Z',
      },
    ],
  };
}

/** Answers GET /receipts/:id from a status the verify mock can move forward. */
function mockApi() {
  const current = { status: 'unverified' as ReceiptStatus };

  api.apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/catalog/receipt/')) {
      current.status = 'verified';
      return { receiptId: 'rc-1', status: 'verified', accepted: 1, rejected: 0 };
    }
    if (path.startsWith('/uploads/')) {
      return { url: 'https://cdn.test/rc-1.png', expiresIn: 60 };
    }
    return { receipt: makeReceiptDetail(current.status) };
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
      <Route path="/catalog/receipts/:id" element={<ReceiptDetailPage />} />
    </Routes>,
    { route: '/catalog/receipts/rc-1' },
  );
}

describe('ReceiptDetailPage verification', () => {
  it('offers the verify action on an unverified receipt', async () => {
    mockApi();
    renderDetail();

    expect(await screen.findByRole('button', { name: 'Verify receipt' })).toBeInTheDocument();
    expect(screen.getByText(/not been added to inventory/i)).toBeInTheDocument();
  });

  it('hides the verify action once the receipt is verified', async () => {
    const current = mockApi();
    current.status = 'verified';
    renderDetail();

    await screen.findByText('Verified');
    expect(screen.queryByRole('button', { name: 'Verify receipt' })).toBeNull();
    expect(screen.queryByText(/not been added to inventory/i)).toBeNull();
  });

  it('hides the verify action from members, who would only get a 403', async () => {
    state.role = 'member';
    mockApi();
    renderDetail();

    await screen.findByText('Needs review');
    expect(screen.queryByRole('button', { name: 'Verify receipt' })).toBeNull();
  });

  it('sends every extracted line as accepted and flips the sheet to verified', async () => {
    const user = userEvent.setup();
    mockApi();
    renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Verify receipt' }));

    await waitFor(() =>
      expect(api.apiFetch).toHaveBeenCalledWith(
        '/catalog/receipt/rc-1/verify',
        expect.objectContaining({
          method: 'POST',
          shopId: 'shop-1',
          body: { items: [{ id: 'li-1', accepted: true }] },
        }),
      ),
    );
    // The sheet hands straight over to the verified state: badge swapped, the
    // action gone, so the receipt cannot be posted twice.
    expect(await screen.findByText('Verified')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verify receipt' })).toBeNull();
  });

  it('keeps the button in place and explains a failed verify', async () => {
    const user = userEvent.setup();
    api.apiFetch.mockImplementation(async (path: string) => {
      if (path.startsWith('/catalog/receipt/')) {
        throw new Error('Receipt is already verified');
      }
      return { receipt: makeReceiptDetail('unverified') };
    });
    renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Verify receipt' }));

    expect(await screen.findByText('Receipt is already verified')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify receipt' })).toBeEnabled();
  });
});
