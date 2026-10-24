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

const state = vi.hoisted(() => ({
  role: 'owner' as 'owner' | 'admin' | 'member',
}));

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
      return {
        receiptId: 'rc-1',
        status: 'verified',
        accepted: 1,
        rejected: 0,
      };
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

it('saves a merchant correction during review and retains the filename in details', async () => {
  const user = userEvent.setup();
  let detail = buildReceiptDetail({
    status: 'unverified',
    merchantName: ' ',
    originalFilename: 'builder.png',
  });
  api.apiFetch.mockImplementation(
    async (path: string, options?: { method?: string; body?: { merchantName: string } }) => {
      if (path.startsWith('/uploads/')) return { url: 'https://cdn.test/rc-1.png', expiresIn: 60 };
      if (options?.method === 'PATCH')
        detail = { ...detail, merchantName: options.body!.merchantName };
      return { receipt: detail };
    },
  );
  renderDetail();
  expect(await screen.findByRole('heading', { name: 'Unknown merchant' })).toBeInTheDocument();
  expect(screen.getByText('builder.png')).toBeInTheDocument();
  await user.type(screen.getByRole('textbox', { name: 'Merchant name' }), '  Market  ');
  await user.click(screen.getByRole('button', { name: 'Save merchant' }));
  expect(await screen.findByRole('heading', { name: 'Market' })).toBeInTheDocument();
  expect(api.apiFetch).toHaveBeenCalledWith(
    '/receipts/rc-1',
    expect.objectContaining({
      method: 'PATCH',
      body: { merchantName: 'Market' },
    }),
  );
  expect(screen.getByText('Unverified')).toBeInTheDocument();
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

    expect(await screen.findByRole('button', { name: 'Verify Receipt' })).toBeInTheDocument();
    expect(screen.getByText(/not been added to inventory/i)).toBeInTheDocument();
  });

  it('hides the verify action once the receipt is verified', async () => {
    const current = mockApi();
    current.status = 'verified';
    renderDetail();

    await screen.findByText('Verified');
    expect(screen.queryByRole('button', { name: 'Verify Receipt' })).toBeNull();
    expect(screen.queryByText(/not been added to inventory/i)).toBeNull();
  });

  it('hides the verify action from members, who would only get a 403', async () => {
    state.role = 'member';
    mockApi();
    renderDetail();

    await screen.findByText('Unverified');
    expect(screen.queryByRole('button', { name: 'Verify Receipt' })).toBeNull();
  });

  it('sends every extracted line as accepted and flips the sheet to verified', async () => {
    const user = userEvent.setup();
    mockApi();
    renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Verify Receipt' }));

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
    expect(screen.queryByRole('button', { name: 'Verify Receipt' })).toBeNull();
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

    await user.click(await screen.findByRole('button', { name: 'Verify Receipt' }));

    expect(await screen.findByText('Receipt is already verified')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify Receipt' })).toBeEnabled();
  });
});

describe('ReceiptDetailPage visual-only actions', () => {
  it('renders edit and line delete as disabled on an unverified receipt', async () => {
    const user = userEvent.setup();
    mockApi();
    renderDetail();
    const edit = await screen.findByRole('button', { name: 'Edit Receipt' });
    const removeLine = screen.getByRole('button', { name: 'Delete Flour' });
    expect(edit).toBeDisabled();
    expect(removeLine).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Delete Receipt' })).toBeNull();
    await user.click(edit);
    await user.click(removeLine);
    expect(
      api.apiFetch.mock.calls.some(
        ([, init]) => init?.method === 'DELETE' || init?.method === 'PATCH',
      ),
    ).toBe(false);
    expect(screen.getByText('Flour')).toBeInTheDocument();
  });

  it('renders edit and receipt delete as disabled on a verified receipt', async () => {
    const user = userEvent.setup();
    const current = mockApi();
    current.status = 'verified';
    renderDetail();
    const edit = await screen.findByRole('button', { name: 'Edit Receipt' });
    const remove = screen.getByRole('button', { name: 'Delete Receipt' });
    expect(edit).toBeDisabled();
    expect(remove).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Delete Flour' })).toBeNull();
    await user.click(edit);
    await user.click(remove);
    expect(
      api.apiFetch.mock.calls.some(
        ([, init]) => init?.method === 'DELETE' || init?.method === 'PATCH',
      ),
    ).toBe(false);
  });

  it('keeps management actions hidden from members', async () => {
    state.role = 'member';
    mockApi();
    renderDetail();
    await screen.findByText('Corner Market');
    expect(screen.queryByRole('button', { name: /Edit|Delete|Verify/ })).toBeNull();
  });

  it('disables verification when there are no extracted lines', async () => {
    api.apiFetch.mockResolvedValue({
      receipt: buildReceiptDetail({ items: [], storagePath: null }),
    });
    renderDetail();
    expect(await screen.findByRole('button', { name: 'Verify Receipt' })).toBeDisabled();
    expect(screen.getByText('No line items were extracted.')).toBeInTheDocument();
  });
});

// Keep these screen contracts independent of persistence; sync integration is exercised separately.
vi.mock('@/features/sync/documentsApi', async () => ({
  documentFetch: (await import('@/lib/api')).apiFetch,
}));
