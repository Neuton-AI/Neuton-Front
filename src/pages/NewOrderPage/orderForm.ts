import type { FormField } from '@/components/FormFields/schema';

export type OrderForm = {
  customerName: string; orderDate: string; deliveryDate: string;
  destinationAddress: string; deliveryFee: string;
};

export function todayInShop(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function validOrderDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date.startsWith('0000')) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

/** Persist noon in the shop's calendar day while deliveryDate remains date-only. */
export function orderDateTimestamp(date: string, timeZone: string): string {
  if (!validOrderDate(date)) throw new Error('Enter a valid order date.');
  const noon = Date.parse(`${date}T12:00:00Z`);
  let instant = noon;
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  for (let pass = 0; pass < 2; pass++) {
    const parts = formatter.formatToParts(new Date(instant));
    const value = (type: string) => parts.find(part => part.type === type)?.value;
    const zoned = Date.parse(`${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}:${value('second')}Z`);
    instant = noon - (zoned - instant);
  }
  return new Date(instant).toISOString();
}

export const orderFields: readonly FormField<OrderForm>[] = [
  { kind: 'input', name: 'customerName', id: 'customer', label: 'Customer name', required: true, maxLength: 160, autoComplete: 'name' },
  { kind: 'group', name: 'dates', className: 'grid grid-cols-2 gap-3', fields: [
    { kind: 'input', name: 'orderDate', id: 'order-date', label: 'Order date', type: 'date', required: true },
    { kind: 'input', name: 'deliveryDate', id: 'delivery-date', label: 'Delivery date', type: 'date', required: true },
  ] },
  { kind: 'input', name: 'destinationAddress', id: 'address', label: 'Delivery address', type: 'text', required: true, maxLength: 300, autoComplete: 'street-address' },
  { kind: 'input', name: 'deliveryFee', id: 'delivery-fee', label: 'Delivery fee', type: 'number', inputMode: 'decimal', required: true, min: 0, max: 99999999.99, step: 0.01 },
];
