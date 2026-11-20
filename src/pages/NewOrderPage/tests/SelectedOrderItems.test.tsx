import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { SelectedOrderItems } from '../components/SelectedOrderItems';
import type { DraftLine } from '../orderDraft';

const line: DraftLine = {
  recipeId: 'recipe-1', name: 'Almond Croissant with Vanilla Cream', quantity: 2,
  unitPrice: '24.00', unitCost: '8.0000', imageUrl: null,
  costComplete: true, available: true, pricingPending: false, reason: null,
};

it('keeps the full name accessible, shows line totals, and controls quantities by ID', async () => {
  const changeQuantity = vi.fn();
  const remove = vi.fn();
  render(<SelectedOrderItems lines={[line]} currency='USD' changeQuantity={changeQuantity} remove={remove} />);
  const row = screen.getByRole('listitem');
  expect(within(row).getByText(line.name)).toHaveAttribute('title', line.name);
  expect(within(row).getByText('$48.00')).toBeInTheDocument();
  expect(within(row).getByText('$24.00')).toBeInTheDocument();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: `Add one ${line.name}` }));
  await user.click(screen.getByRole('button', { name: `Remove one ${line.name}` }));
  await user.click(screen.getByRole('button', { name: `Remove ${line.name}` }));
  expect(changeQuantity.mock.calls).toEqual([[{ id: line.recipeId }, 1], [{ id: line.recipeId }, -1]]);
  expect(remove).toHaveBeenCalledWith(line.recipeId);
});

it('preserves unavailable quantities, disables counters and keeps removal available', () => {
  render(<SelectedOrderItems lines={[{ ...line, available: false }]} currency='USD' changeQuantity={vi.fn()} remove={vi.fn()} />);
  expect(screen.getByLabelText(`Quantity of ${line.name}`)).toHaveTextContent('2');
  expect(screen.getByRole('button', { name: `Add one ${line.name}` })).toBeDisabled();
  expect(screen.getByRole('button', { name: `Remove one ${line.name}` })).toBeDisabled();
  expect(screen.getByRole('button', { name: `Remove ${line.name}` })).toBeEnabled();
});
