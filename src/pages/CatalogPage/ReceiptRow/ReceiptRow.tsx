import { InlineNotice } from '@/components/feedback';
import type { Receipt } from '@/features/receipts/types';
import { formatDate, formatMoney } from '@/lib/format';
import { Link } from 'react-router-dom';
import { ReceiptStatusPill } from './ReceiptStatusPill/ReceiptStatusPill';
export function ReceiptRow({ receipt, currency }: { receipt: Receipt; currency: string }) {
  return (
    <Link
      to={`/catalog/receipts/${receipt.id}`}
      className="pressable flex flex-col gap-2 rounded-card bg-surface-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 flex-1 font-display text-[22px] leading-tight text-ink">
          {receipt.merchantName?.trim() || 'Unknown merchant'}
        </h2>
        <ReceiptStatusPill status={receipt.status} />
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-label text-ink-muted">
          {receipt.receiptDate ? formatDate(receipt.receiptDate) : 'Date unavailable'}
        </p>
        <p className="font-display text-[20px] text-ink">
          {receipt.totalAmount != null && receipt.totalAmount !== ''
            ? formatMoney(receipt.totalAmount, receipt.currency ?? currency)
            : '\u2014'}
        </p>
      </div>
      {receipt.status === 'failed' && receipt.errorMessage ? (
        <InlineNotice tone="error">{receipt.errorMessage}</InlineNotice>
      ) : null}
    </Link>
  );
}
