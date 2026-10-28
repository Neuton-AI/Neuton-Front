import type React from "react";
import { SheetBadge } from "@/components/Sheet/Sheet";
import { VerificationStatus } from "@/components/VerificationStatus/VerificationStatus";
import {
  getReceiptStatusLabel,
  getReceiptStatusTone,
} from "@/features/receipts/receiptStatus";
import type { ReceiptStatus } from "@/features/receipts/types";

export { VerificationStatusIcon as ReceiptStatusIcon } from "@/components/VerificationStatus/VerificationStatus";

interface IReceiptDetailStatus {
  status: ReceiptStatus;
}

export const ReceiptDetailStatus: React.FC<IReceiptDetailStatus> = ({
  status,
}) => {
  if (status !== "verified" && status !== "unverified") {
    return (
      <SheetBadge tone={getReceiptStatusTone(status)}>
        {getReceiptStatusLabel(status)}
      </SheetBadge>
    );
  }
  return <VerificationStatus verified={status === "verified"} />;
};
