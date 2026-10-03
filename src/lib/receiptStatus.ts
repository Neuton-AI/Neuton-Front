import type { ReceiptStatus } from './api';

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  pending: 'Queued',
  processing: 'Reading…',
  completed: 'Done',
  failed: 'Failed',
};

export const RECEIPT_STATUS_TONES = {
  pending: 'card',
  processing: 'teal',
  completed: 'success',
  failed: 'danger',
} as const;

export type ReceiptStatusTone = (typeof RECEIPT_STATUS_TONES)[keyof typeof RECEIPT_STATUS_TONES];

export const RECEIPT_STATUS_PILL_STYLES: Record<ReceiptStatus, string> = {
  pending: 'bg-surface-cream-strong text-ink-muted',
  processing: 'bg-brand-amber/20 text-ink',
  completed: 'bg-brand-teal/20 text-ink',
  failed: 'bg-semantic-error/15 text-ink',
};

export function getReceiptStatusLabel(status: ReceiptStatus): string {
  return RECEIPT_STATUS_LABELS[status];
}

export function getReceiptStatusTone(status: ReceiptStatus): ReceiptStatusTone | 'card' {
  return RECEIPT_STATUS_TONES[status] ?? 'card';
}
