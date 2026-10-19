import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ManualProductForm } from './ManualProductForm';

it('submits package pricing with ingredient context and the five Paper units', () => {
  const save = vi.fn();
  render(
    <ManualProductForm
      onSave={save}
      busy={false}
      currency="ILS"
      ingredient={{
        rawMaterialName: 'Butter',
        quantity: '120',
        rawSrcUnit: 'g',
      }}
    />,
  );
  expect(screen.getByText('Butter · 120 g in this recipe')).toBeInTheDocument();
  expect(screen.getByText('₪')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Product name'), {
    target: { value: 'Unsalted butter' },
  });
  fireEvent.change(screen.getByLabelText('Price'), {
    target: { value: '4.50' },
  });
  fireEvent.change(screen.getByLabelText('Package size'), {
    target: { value: '250' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Package unit' }));
  for (const unit of ['Grams', 'Kilograms', 'Milliliters', 'Liters', 'Pieces'])
    expect(screen.getByText(unit)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /kg Kilograms/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Save & link' }));
  expect(save).toHaveBeenCalledWith({
    name: 'Unsalted butter',
    price: 4.5,
    packageSize: 250,
    packageUnit: 'kg',
  });
});

it('retains fields after failure, permits free products and disables controls while saving', () => {
  const save = vi.fn();
  const { rerender } = render(<ManualProductForm onSave={save} busy={false} currency="USD" />);
  fireEvent.change(screen.getByLabelText('Product name'), {
    target: { value: 'Butter' },
  });
  fireEvent.change(screen.getByLabelText('Price'), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText('Package size'), {
    target: { value: '250' },
  });
  rerender(<ManualProductForm onSave={save} busy currency="USD" />);
  expect(screen.getByLabelText('Product name')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  rerender(
    <ManualProductForm onSave={save} busy={false} currency="USD" error="Could not save product" />,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Could not save product');
  expect(screen.getByLabelText('Product name')).toHaveValue('Butter');
  fireEvent.click(screen.getByRole('button', { name: 'Save & link' }));
  expect(save).toHaveBeenCalledWith({
    name: 'Butter',
    price: 0,
    packageSize: 250,
    packageUnit: 'g',
  });
});
