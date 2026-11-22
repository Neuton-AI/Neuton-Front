import { useState } from 'react';
import type { Shop } from '@/features/shops/types';
import type { OrderDetail } from '@/features/orders/types';
import { orderFields, todayInShop, type OrderForm } from './orderForm';

export function useOrderForm(scope: string, shop: Shop | null, order?: OrderDetail) {
  const key = JSON.stringify([scope, shop?.id, order?.id]);
  const initialize = () => {
    const day = todayInShop(shop?.timezone ?? 'UTC');
    const values: OrderForm = order ? {
      customerName: order.customerName ?? '',
      destinationAddress: order.destinationAddress ?? '',
      orderDate: todayInShop(shop?.timezone ?? 'UTC', new Date(order.orderDate)),
      deliveryDate: order.deliveryDate ?? '',
      deliveryFee: order.deliveryFee,
    } : {
      customerName: '', destinationAddress: '', orderDate: day, deliveryDate: day,
      deliveryFee: shop?.deliveryBaseFee ?? '0',
    };
    return { key, values, initial: values };
  };
  const [state, setState] = useState(initialize);
  if (state.key !== key) setState(initialize());
  const current = state.key === key ? state : initialize();
  const datesChanged = !order || current.initial.orderDate !== current.values.orderDate ||
    current.initial.deliveryDate !== current.values.deliveryDate;
  const minDeliveryDate = datesChanged ? current.values.orderDate : '';
  return {
    fields: orderFields(minDeliveryDate, order && {
      customerName: !current.initial.customerName,
      destinationAddress: !current.initial.destinationAddress,
      deliveryDate: !current.initial.deliveryDate,
    }),
    initialValues: current.initial,
    formValues: current.values,
    formDirty: JSON.stringify(current.values) !== JSON.stringify(current.initial),
    handleFieldChange: (name: keyof OrderForm, value: string) => setState(previous => {
      if (previous.key !== key) return previous;
      return { ...previous, values: { ...previous.values, [name]: value } };
    }),
  };
}
