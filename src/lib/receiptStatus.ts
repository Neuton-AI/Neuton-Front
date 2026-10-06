import type { ReceiptStatus } from './api';

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  pending: 'Queued',
  processing: 'Reading…',
  completed: 'Done',
  // `completed` is what the extraction worker writes; a human still has to sign
  // these off, so the two are separate states rather than a rename.
  unverified: 'Needs review',
  verified: 'Verified',
  failed: 'Failed',
};

export const RECEIPT_STATUS_TONES = {
  pending: 'card',
  processing: 'teal',
  completed: 'success',
  // Neutral rather than alarming: `unverified` is the normal resting state of a
  // freshly extracted receipt, not a problem. The label carries the call to action.
  unverified: 'card',
  verified: 'success',
  failed: 'danger',
} as const;

export type ReceiptStatusTone = (typeof RECEIPT_STATUS_TONES)[keyof typeof RECEIPT_STATUS_TONES];

export const RECEIPT_STATUS_PILL_STYLES: Record<ReceiptStatus, string> = {
  pending: 'bg-surface-cream-strong text-ink-muted',
  processing: 'bg-brand-amber/20 text-ink',
  completed: 'bg-brand-teal/20 text-ink',
  // Amber reads as "action needed" without the alarm of a failure.
  unverified: 'bg-brand-amber/20 text-ink',
  verified: 'bg-brand-teal/20 text-ink',
  failed: 'bg-semantic-error/15 text-ink',
};

export function getReceiptStatusLabel(status: ReceiptStatus): string {
  return RECEIPT_STATUS_LABELS[status];
}

export function getReceiptStatusTone(status: ReceiptStatus): ReceiptStatusTone | 'card' {
  return RECEIPT_STATUS_TONES[status] ?? 'card';
}
