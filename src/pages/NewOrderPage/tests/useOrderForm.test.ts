import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { buildShop } from '@/test/factories/shops.factory';
import { useOrderForm } from '../useOrderForm';

it('initializes the loaded shop default once and preserves an edited zero fee on refetch', () => {
  const shop = buildShop({ deliveryBaseFee: '7.25' });
  const { result, rerender } = renderHook(({ current }) => useOrderForm('user:shop-1', current), {
    initialProps: { current: shop },
  });
  expect(result.current.formValues.deliveryFee).toBe('7.25');
  expect(result.current.formDirty).toBe(false);
  act(() => result.current.handleFieldChange('deliveryFee', '0'));
  rerender({ current: { ...shop, deliveryBaseFee: '99.00' } });
  expect(result.current.formValues.deliveryFee).toBe('0');
  expect(result.current.formDirty).toBe(true);
});

it('keeps the two calendar dates independently editable', () => {
  const { result } = renderHook(() => useOrderForm('user:shop-1', buildShop()));
  expect(result.current.formValues.deliveryDate).toBe(result.current.formValues.orderDate);
  act(() => result.current.handleFieldChange('deliveryDate', '2026-12-01'));
  act(() => result.current.handleFieldChange('orderDate', '2026-11-30'));
  expect(result.current.formValues.deliveryDate).toBe('2026-12-01');
  expect(result.current.formValues.orderDate).toBe('2026-11-30');
});

it('reinitializes fields for a different account or shop', () => {
  const shop = buildShop({ deliveryBaseFee: '5.00' });
  const { result, rerender } = renderHook(({ scope, current }) => useOrderForm(scope, current), {
    initialProps: { scope: 'user-1:shop-1', current: shop },
  });
  act(() => result.current.handleFieldChange('customerName', 'Ada'));
  rerender({ scope: 'user-2:shop-1', current: shop });
  expect(result.current.formValues.customerName).toBe('');
  act(() => result.current.handleFieldChange('deliveryFee', '0'));
  rerender({ scope: 'user-2:shop-2', current: buildShop({ id: 'shop-2', deliveryBaseFee: '3.00' }) });
  expect(result.current.formValues.deliveryFee).toBe('3.00');
  expect(result.current.formDirty).toBe(false);
});
