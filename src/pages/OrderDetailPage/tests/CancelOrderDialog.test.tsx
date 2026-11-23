import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { OrderDetail } from '@/features/orders/types';
import { CancelOrderDialog } from '../components/CancelOrderDialog/CancelOrderDialog';

const order: OrderDetail = {
  id: 'order-1', shopId: 'shop-1', orderNumber: 1048, userId: null, customerName: 'Maya Cohen',
  orderDate: '2026-11-21', destinationAddress: null, deliveryDistanceKm: '0.00', deliveryFee: '0.00',
  appliedProfitMargin: null, totalCost: '75.00', totalAmount: '200.00', documentUrl: null,
  status: 'processing', netProfit: 125, createdAt: '2026-11-21', paymentHistory: [],
  paymentSummary: { status: 'unpaid', totalReceived: '0.00', balanceDue: '200.00', refundDue: '0.00', depositAmount: '0.00', depositDate: null },
  items: [
    { id: 'cake-line', recipeId: 'cake', name: 'Honey Cake', quantity: '2.750', unitCost: '4.00', unitPrice: '6.00' },
    { id: 'cookie-line', recipeId: 'cookie', name: 'Cookie', quantity: '0.750', unitCost: '2.00', unitPrice: '3.00' },
  ],
};

it('starts unanswered, limits finished units, and clears selections when switching to No', async () => {
  const user = userEvent.setup();
  const confirm = vi.fn();
  render(<CancelOrderDialog order={order} currency="USD" onConfirm={confirm} onCancel={vi.fn()} />);
  const dialog = within(screen.getByRole('dialog', { name: 'Cancel order' }));
  const yes = dialog.getByRole('radio', { name: 'Yes' });
  const no = dialog.getByRole('radio', { name: 'No' });
  expect(yes).not.toBeChecked();
  expect(no).not.toBeChecked();
  expect(dialog.getByRole('button', { name: 'Cancel order' })).toBeDisabled();
  await user.click(yes);
  expect(dialog.getByRole('checkbox', { name: 'Add Cookie' })).toBeDisabled();
  await user.click(dialog.getByRole('checkbox', { name: 'Add Honey Cake' }));
  const quantity = dialog.getByRole('spinbutton', { name: 'Quantity of Honey Cake to add' });
  expect(quantity).toHaveValue(2);
  await user.clear(quantity);
  await user.type(quantity, '3');
  expect(dialog.getByRole('button', { name: 'Cancel order' })).toBeDisabled();
  await user.click(no);
  expect(dialog.queryByRole('checkbox', { name: 'Add Honey Cake' })).not.toBeInTheDocument();
  expect(dialog.getByText(/permanently deleted/)).toBeInTheDocument();
  await user.click(yes);
  expect(dialog.getByRole('checkbox', { name: 'Add Honey Cake' })).not.toBeChecked();
  await user.click(dialog.getByRole('button', { name: 'Cancel order' }));
  expect(confirm).toHaveBeenCalledOnce();
  expect(confirm).toHaveBeenCalledWith({ madeItems: true, stockItems: [] });
});

it('previews the actual receipts as the full refund and dismisses without a submission', async () => {
  const user = userEvent.setup();
  const confirm = vi.fn();
  const close = vi.fn();
  const paid = { ...order, paymentSummary: { ...order.paymentSummary!, totalReceived: '50.00' } };
  render(<CancelOrderDialog order={paid} currency="USD" onConfirm={confirm} onCancel={close} />);
  const dialog = within(screen.getByRole('dialog', { name: 'Cancel order' }));
  await user.click(dialog.getByRole('radio', { name: 'No' }));
  expect(dialog.getByText('Refund due · $50.00')).toBeInTheDocument();
  expect(dialog.queryByRole('button', { name: 'Delete order' })).not.toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(close).toHaveBeenCalledOnce();
  expect(confirm).not.toHaveBeenCalled();
});
