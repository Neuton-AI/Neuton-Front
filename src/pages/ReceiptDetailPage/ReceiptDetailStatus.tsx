import { SheetBadge } from '@/components/Sheet/Sheet';
import { VerificationStatus } from '@/components/VerificationStatus';
import { getReceiptStatusLabel, getReceiptStatusTone } from '@/features/receipts/receiptStatus';
import type { ReceiptStatus } from '@/features/receipts/types';

export { VerificationStatusIcon as ReceiptStatusIcon } from '@/components/VerificationStatus';

export function ReceiptDetailStatus({ status }: { status: ReceiptStatus }) {
  if (status !== 'verified' && status !== 'unverified') {
    return (
      <SheetBadge tone={getReceiptStatusTone(status)}>{getReceiptStatusLabel(status)}</SheetBadge>
    );
  }
  return <VerificationStatus verified={status === 'verified'} />;
}
