import type { ReceiptDetail, ReceiptStatus } from '@/features/receipts/types';
import { buildReceiptDetail } from '@/test/factories/receipts.factory';
import { renderWithRouter } from '@/test/render';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The worker hands an extracted receipt over as `unverified` and stops, so the
 * detail sheet is the only place a human can move it the rest of the way. These
 * tests pin that the sheet offers that move to the people allowed to make it
 * (owner/admin), sends every extracted line as accepted, and stops offering it
 * once the receipt is verified.
 */

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: api.apiFetch,
}));

const state = vi.hoisted(() => ({ role: 'owner' as 'owner' | 'admin' | 'member' }));

vi.mock('@/features/auth/supabase', async () => {
  const { buildShop } = await import('@/test/factories/shops.factory');
  const shop = buildShop();
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

const { ReceiptDetailPage } = await import('@/pages/ReceiptDetailPage/ReceiptDetailPage');

function makeReceiptDetail(status: ReceiptStatus): ReceiptDetail {
  return buildReceiptDetail({ status });
}

/** Answers GET /receipts/:id from a status the verify mock can move forward. */
function mockApi() {
  const current = { status: 'unverified' as ReceiptStatus };

  api.apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/receipts/') && path.endsWith('/verify')) {
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
      <Route path="/catalog" element={<h1>Catalog destination</h1>} />
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
        '/receipts/rc-1/verify',
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

  it('renders a dash, not $0.00, for a line whose total could not be read', async () => {
    const detail = makeReceiptDetail('unverified');
    detail.items = [
      {
        ...detail.items[0]!,
        unitPrice: null,
        totalPrice: null,
      },
    ];
    api.apiFetch.mockImplementation(async (path: string) => {
      if (path.startsWith('/uploads/')) {
        return { url: 'https://cdn.test/rc-1.png', expiresIn: 60 };
      }
      return { receipt: detail };
    });
    renderDetail();

    await screen.findByText('Flour');
    // A missing total must read as unknown, never as a free item.
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('$0.00')).toBeNull();
  });

  it('keeps the button in place and explains a failed verify', async () => {
    const user = userEvent.setup();
    api.apiFetch.mockImplementation(async (path: string) => {
      if (path.startsWith('/receipts/') && path.endsWith('/verify')) {
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

describe('ReceiptDetailPage delete', () => {
  it('enables delete on an unverified receipt', async () => {
    mockApi();
    renderDetail();

    expect(await screen.findByRole('button', { name: 'Delete receipt' })).toBeEnabled();
  });

  it('disables delete on a verified receipt and explains why', async () => {
    const current = mockApi();
    current.status = 'verified';
    renderDetail();

    const button = await screen.findByRole('button', { name: 'Delete receipt' });
    expect(button).toBeDisabled();
    expect(screen.getByText(/already moved stock and count as spend/i)).toBeInTheDocument();
  });

  it('hides the delete action from members, who would only get a 403', async () => {
    state.role = 'member';
    mockApi();
    renderDetail();

    await screen.findByText('Corner Market');
    expect(screen.queryByRole('button', { name: 'Delete receipt' })).toBeNull();
  });

  it('calls DELETE /receipts/:id after confirmation', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockApi();
    renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Delete receipt' }));

    await waitFor(() =>
      expect(api.apiFetch).toHaveBeenCalledWith(
        '/receipts/rc-1',
        expect.objectContaining({ method: 'DELETE', shopId: 'shop-1' }),
      ),
    );
    expect(await screen.findByRole('heading', { name: 'Catalog destination' })).toBeInTheDocument();
    confirm.mockRestore();
  });

  it('explains a failed delete inline (e.g. a 409 race with verify)', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.apiFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith('/uploads/')) {
        return { url: 'https://cdn.test/rc-1.png', expiresIn: 60 };
      }
      if (init?.method === 'DELETE') {
        throw new Error(
          'A verified receipt already moved stock and counted as spend; it cannot be deleted',
        );
      }
      return { receipt: makeReceiptDetail('unverified') };
    });
    renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Delete receipt' }));

    expect(await screen.findByText(/already moved stock/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete receipt' })).toBeEnabled();
  });
});
