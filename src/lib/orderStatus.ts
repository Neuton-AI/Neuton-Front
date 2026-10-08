import type { OrderStatus } from './api';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  // The normal resting state of a freshly placed order: made, not handed over.
  processing: 'Processing',
  delivered: 'Delivered',
  // A void stays visible so the invoice sequence never shows a hole.
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_TONES = {
  // In-progress work, same as a receipt being read: teal, not alarming.
  processing: 'teal',
  delivered: 'success',
  // A cancelled order is closed and can never come back — it reads as a stop.
  cancelled: 'danger',
} as const;

export type OrderStatusTone = (typeof ORDER_STATUS_TONES)[keyof typeof ORDER_STATUS_TONES];

export function getOrderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status];
}

export function getOrderStatusTone(status: OrderStatus): OrderStatusTone | 'card' {
  return ORDER_STATUS_TONES[status] ?? 'card';
}
