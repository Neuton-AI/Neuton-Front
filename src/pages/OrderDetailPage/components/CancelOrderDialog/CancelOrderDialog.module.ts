import type { CancelOrderBody, OrderDetail } from '@/features/orders/types';
import { formatMoney, toNumber } from '@/lib/format';
import { useState } from 'react';

export const useCancelOrderDialog = (order: OrderDetail, currency: string, onConfirm: (body: CancelOrderBody) => void) => {
  const [madeItems, setMadeItems] = useState<boolean | null>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const lines = order.items.map(line => ({
    ...line, maximum: Math.floor(toNumber(line.quantity)), entered: quantities[line.id],
  }));
  const selected = lines.filter(line => line.entered !== undefined);
  const invalid = selected.some(line => !/^\d+$/.test(line.entered) || Number(line.entered) < 1 || Number(line.entered) > line.maximum);
  const received = toNumber(order.paymentSummary?.totalReceived);
  const hasPaymentData = !!order.paymentSummary;
  const permanent = madeItems === false && hasPaymentData && received === 0;

  const choose = (answer: boolean) => {
    setMadeItems(answer);
    if (!answer) setQuantities({});
  };
  const setQuantity = (id: string, value: string) => setQuantities(previous => ({ ...previous, [id]: value }));
  const selectLine = (id: string, checked: boolean, max: number) => {
    if (checked) {
      setQuantity(id, String(max));
      return;
    }
    setQuantities(previous => {
      const { [id]: _removed, ...remaining } = previous;
      return remaining;
    });
  };
  const confirm = () => {
    if (madeItems === null || invalid || !hasPaymentData) return;
    onConfirm({ madeItems, stockItems: selected.map(line => ({ orderItemId: line.id, quantity: Number(line.entered) })) });
  };

  return { madeItems, choose, lines, selectLine, setQuantity, selected, permanent, hasPaymentData, invalid, confirm,
    refund: received > 0 ? formatMoney(received, currency, { exact: true }) : null };
};

export type CancellationLine = ReturnType<typeof useCancelOrderDialog>['lines'][number];
