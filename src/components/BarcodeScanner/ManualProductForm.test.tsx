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
    quantity: 120,
    rawSrcUnit: 'g',
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
  fireEvent.change(screen.getByLabelText('Amount used in this recipe'), {
    target: { value: '100' },
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
    quantity: 100,
    rawSrcUnit: 'g',
  });
});

it('keeps recipe usage visible, clears incompatible amounts and restricts units by product type', () => {
  const save = vi.fn();
  render(
    <ManualProductForm
      onSave={save}
      busy={false}
      currency="ILS"
      ingredient={{
        rawMaterialName: 'Butter',
        quantity: '2',
        rawSrcUnit: 'pcs',
      }}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Package unit' }));
  fireEvent.click(screen.getByRole('button', { name: /g Grams/ }));
  const amount = screen.getByLabelText('Amount used in this recipe');
  const usageUnit = screen.getByLabelText('Recipe amount unit');
  expect(amount).toHaveValue(null);
  expect(amount).toBeRequired();
  expect([...usageUnit.querySelectorAll('option')].map((o) => o.value)).toEqual([
    'mg',
    'g',
    'kg',
    'oz',
    'lb',
  ]);
  fireEvent.change(screen.getByLabelText('Product name'), {
    target: { value: 'Butter' },
  });
  fireEvent.change(screen.getByLabelText('Price'), { target: { value: '10' } });
  fireEvent.change(screen.getByLabelText('Package size'), {
    target: { value: '500' },
  });
  fireEvent.submit(amount.closest('form')!);
  expect(save).not.toHaveBeenCalled();
  fireEvent.change(amount, { target: { value: '150' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save & link' }));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ quantity: 150, rawSrcUnit: 'g' }));
  fireEvent.click(screen.getByRole('button', { name: 'Package unit' }));
  fireEvent.click(screen.getByRole('button', { name: /ml Milliliters/ }));
  expect(screen.getByLabelText('Amount used in this recipe')).toBe(amount);
  expect(amount).toHaveValue(null);
  expect([...usageUnit.querySelectorAll('option')].map((o) => o.value)).toEqual([
    'ml',
    'l',
    'tsp',
    'tbsp',
    'cup',
  ]);
  fireEvent.click(screen.getByRole('button', { name: 'Package unit' }));
  fireEvent.click(screen.getByRole('button', { name: /pcs Pieces/ }));
  expect(amount).toHaveValue(null);
  expect([...usageUnit.querySelectorAll('option')].map((o) => o.value)).toEqual(['each', 'dozen']);
});

it.each([
  ['0.2', 'kg', 200],
  ['120', 'g', 120],
  ['2', 'heaped tbsp', null],
  ['0', 'g', null],
  ['2', 'unknown', null],
])('prefills only resolvable compatible usage: %s %s', (quantity, rawSrcUnit, expected) => {
  render(
    <ManualProductForm
      onSave={vi.fn()}
      busy={false}
      currency="ILS"
      ingredient={{ rawMaterialName: 'Butter', quantity, rawSrcUnit }}
    />,
  );
  expect(screen.getByLabelText('Amount used in this recipe')).toHaveValue(expected);
});

it('keeps user usage across compatible package changes and converts when its own unit changes', () => {
  render(
    <ManualProductForm
      onSave={vi.fn()}
      busy={false}
      currency="ILS"
      ingredient={{
        rawMaterialName: 'Butter',
        quantity: '0.2',
        rawSrcUnit: 'kg',
      }}
    />,
  );
  const amount = screen.getByLabelText('Amount used in this recipe');
  fireEvent.change(amount, { target: { value: '150' } });
  fireEvent.click(screen.getByRole('button', { name: 'Package unit' }));
  fireEvent.click(screen.getByRole('button', { name: /kg Kilograms/ }));
  expect(amount).toHaveValue(150);
  fireEvent.change(screen.getByLabelText('Recipe amount unit'), {
    target: { value: 'kg' },
  });
  expect(amount).toHaveValue(0.15);
});

it.each([
  ['גרם', 'g', '120.000', 120],
  ['tsp', 'ml', '4.929', 4.929],
  ['piece', 'each', '2.000', 2],
])(
  'uses API base amounts for extracted %s aliases',
  (rawSrcUnit, baseUnit, baseUnitAmount, expected) => {
    render(
      <ManualProductForm
        onSave={vi.fn()}
        busy={false}
        currency="ILS"
        ingredient={{
          rawMaterialName: 'Ingredient',
          quantity: '1',
          rawSrcUnit,
          baseUnit,
          baseUnitAmount,
        }}
      />,
    );
    expect(screen.getByLabelText('Amount used in this recipe')).toHaveValue(expected);
    expect(screen.getByLabelText('Recipe amount unit')).toHaveValue(baseUnit);
  },
);
