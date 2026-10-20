import { renderWithRouter } from '@/test/render';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { OrdersPage } from './OrdersPage';
import { useOrdersPage, type OrdersPageModel } from './OrdersPage.module';
vi.mock('./OrdersPage.module', () => ({ useOrdersPage: vi.fn() }));
it('renders module errors and forwards retry and status-selection actions', async () => {
  const model: OrdersPageModel = {
    fabNavigation: { onCapture: vi.fn(), onUploadFile: vi.fn() },
    statusFilter: 'all',
    setStatusFilter: vi.fn(),
    error: new Error('offline'),
    refetch: vi.fn(),
    loading: false,
    message: 'offline',
    currency: 'USD',
    visibleOrders: [],
  };
  vi.mocked(useOrdersPage).mockReturnValue(model);
  renderWithRouter(<OrdersPage />);
  const user = userEvent.setup();
  expect(screen.getByRole('alert')).toHaveTextContent('offline');
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(model.refetch).toHaveBeenCalledOnce();
  await user.click(screen.getByRole('tab', { name: 'Delivered' }));
  expect(model.setStatusFilter).toHaveBeenCalledWith('delivered');
});

// Keep these screen contracts independent of persistence; sync integration is exercised separately.
vi.mock('@/features/sync/documentsApi', async () => ({ documentFetch: (await import('@/lib/api')).apiFetch }));
