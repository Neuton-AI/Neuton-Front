import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Receipt, ReceiptStatus } from '../lib/api';
import { renderWithRouter } from '../test/render';

/**
 * The receipts tab is where a user goes to find out what happened to an upload,
 * so every row has to open its detail sheet. The sheet polls while a receipt is
 * `processing`, shows the failure reason and offers "Try extraction again" for a
 * `failed` one - none of which is reachable unless the row itself is a link.
 * These tests pin that link per status, and pin that it is a real anchor so the
 * row stays keyboard- and screen-reader-navigable rather than a click handler.
 */

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

const { CatalogPage } = await import('./CatalogPage');

const WhereAmI = () => {
  const { pathname } = useLocation();
  return <output data-testid="where">{pathname}</output>;
};

function makeReceipt(status: ReceiptStatus, overrides: Partial<Receipt> = {}): Receipt {
  return {
    id: `rc-${status}`,
    shopId: 'shop-1',
    uploadedBy: 'u1',
    storagePath: `receipts/${status}.png`,
    contentType: 'image/png',
    originalFilename: `${status}.png`,
    merchantName: `Merchant ${status}`,
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
    ...overrides,
  };
}

function renderCatalog(receipts: Receipt[]) {
  api.apiFetch.mockImplementation(async (path: string) => {
    // Navigating a row away drops the tab param, so the recipes tab is fetched
    // next; every endpoint answers with its real envelope.
    if (path.startsWith('/receipts')) return { receipts };
    if (path.startsWith('/inventory')) return { items: [] };
    return { recipes: [] };
  });

  return renderWithRouter(
    <>
      <CatalogPage />
      <WhereAmI />
    </>,
    { route: '/catalog?tab=receipts' },
  );
}

beforeEach(() => {
  api.apiFetch.mockReset();
});

describe('CatalogPage receipts tab', () => {
  it.each<ReceiptStatus>(['pending', 'processing', 'failed', 'unverified', 'verified'])(
    'renders a %s receipt row as a link to its detail sheet',
    async (status) => {
      // The regression: the link used to be gated on a single "done" status, so
      // every other status was a dead card and the sheet - including its 3s poll
      // - could only be reached by typing the URL by hand.
      renderCatalog([makeReceipt(status)]);

      const row = await screen.findByRole('link', { name: new RegExp(`Merchant ${status}`) });

      expect(row).toHaveAttribute('href', `/catalog/receipts/rc-${status}`);
      // A real anchor, not a div with an onClick: that is what makes the row
      // keyboard reachable, openable in a new tab, and announced as a link.
      expect(row.tagName).toBe('A');
    },
  );

  it('opens the detail sheet when a queued receipt row is activated', async () => {
    const user = userEvent.setup();
    renderCatalog([makeReceipt('pending')]);

    const row = await screen.findByRole('link', { name: /Merchant pending/ });
    await user.click(row);

    await waitFor(() =>
      expect(screen.getByTestId('where')).toHaveTextContent('/catalog/receipts/rc-pending'),
    );
  });

  it('lets the keyboard reach a processing row and open it with Enter', async () => {
    const user = userEvent.setup();
    renderCatalog([makeReceipt('processing')]);

    const row = await screen.findByRole('link', { name: /Merchant processing/ });

    let reached = false;
    for (let step = 0; step < 12 && !reached; step += 1) {
      if (document.activeElement === row) reached = true;
      else await user.tab();
    }
    expect(reached).toBe(true);

    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(screen.getByTestId('where')).toHaveTextContent('/catalog/receipts/rc-processing'),
    );
  });

  it('keeps the failure reason on the row while making it a link', async () => {
    renderCatalog([
      makeReceipt('failed', {
        errorMessage: 'The scan was too blurry to read.',
      }),
    ]);

    const row = await screen.findByRole('link', { name: /Merchant failed/ });

    expect(row).toHaveAttribute('href', '/catalog/receipts/rc-failed');
    // The inline notice is a summary; the sheet carries the full reason and the
    // retry action, so the row must still say what went wrong at a glance.
    expect(row).toHaveTextContent('The scan was too blurry to read.');
  });

  it('keeps every row a link when a receipt is unnamed and has no total', async () => {
    renderCatalog([
      makeReceipt('pending', {
        merchantName: null,
        originalFilename: null,
        totalAmount: null,
      }),
    ]);

    const row = await screen.findByRole('link', { name: /Unnamed receipt/ });

    expect(row).toHaveAttribute('href', '/catalog/receipts/rc-pending');
  });
});