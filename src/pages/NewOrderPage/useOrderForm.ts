import { useState } from 'react';
import type { Shop } from '@/features/shops/types';
import { orderFields, todayInShop, type OrderForm } from './orderForm';

export function useOrderForm(scope: string, shop: Shop | null) {
  const key = JSON.stringify([scope, shop?.id]);
  const initialize = () => {
    const day = todayInShop(shop?.timezone ?? 'UTC');
    const values: OrderForm = {
      customerName: '', destinationAddress: '', orderDate: day, deliveryDate: day,
      deliveryFee: shop?.deliveryBaseFee ?? '0',
    };
    return { key, values, initial: values };
  };
  const [state, setState] = useState(initialize);
  if (state.key !== key) setState(initialize());
  const current = state.key === key ? state : initialize();
  return {
    fields: orderFields(current.values.orderDate),
    formValues: current.values,
    formDirty: JSON.stringify(current.values) !== JSON.stringify(current.initial),
    handleFieldChange: (name: keyof OrderForm, value: string) => setState(previous => {
      if (previous.key !== key) return previous;
      return { ...previous, values: { ...previous.values, [name]: value } };
    }),
  };
}
