import { SheetBadge } from '@/components/Sheet/Sheet';
import { getReceiptStatusLabel, getReceiptStatusTone } from '@/features/receipts/receiptStatus';
import type { ReceiptStatus } from '@/features/receipts/types';

export function ReceiptStatusIcon({
  verified,
  className,
}: {
  verified: boolean;
  className: string;
}) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      {verified ? (
        <path
          d="M5.2 8.2L7.1 10L10.8 6.2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <path d="M8 4.9V8.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="10.8" r="0.9" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

export function ReceiptDetailStatus({ status }: { status: ReceiptStatus }) {
  if (status !== 'verified' && status !== 'unverified') {
    return (
      <SheetBadge tone={getReceiptStatusTone(status)}>{getReceiptStatusLabel(status)}</SheetBadge>
    );
  }
  const verified = status === 'verified';
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-pill py-1.5 pl-2.5 pr-3.5 text-label font-medium ${verified ? 'bg-brand-teal text-ink' : 'bg-[#F6DEDA] text-[#A63B3B]'}`}
    >
      <ReceiptStatusIcon verified={verified} className="h-4 w-4 shrink-0" />
      {verified ? 'Verified' : 'Unverified'}
    </span>
  );
}
