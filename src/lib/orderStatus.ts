import type { OrderStatus } from './api';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  // The normal resting state of a freshly placed order: made, not handed over.
  processing: 'Processing',
  delivered: 'Delivered',
  // A void stays visible so the invoice sequence never shows a hole. The UI
  // says "Deleted" (the shop's word, and the design's) for the same state.
  cancelled: 'Deleted',
};

export const ORDER_STATUS_TONES = {
  // In-progress work, same as a receipt being read: teal, not alarming.
  processing: 'teal',
  delivered: 'success',
  // A deleted order is closed for good: the design drains it to grey, not red.
  cancelled: 'deleted',
} as const;

export type OrderStatusTone = (typeof ORDER_STATUS_TONES)[keyof typeof ORDER_STATUS_TONES];

export function getOrderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status];
}

export function getOrderStatusTone(status: OrderStatus): OrderStatusTone | 'card' {
  return ORDER_STATUS_TONES[status] ?? 'card';
}
