import type React from "react";
import { InlineNotice } from "@/components/feedback";
import { IconEdit, IconTrash } from "@/components/icons";
import type { ReceiptDetailPageModel } from "../../ReceiptDetailPage.module";
import { ReceiptStatusIcon } from "../ReceiptDetailStatus/ReceiptDetailStatus";

const actionClassName =
  "inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-card text-body font-semibold";

interface IReceiptActions {
  model: ReceiptDetailPageModel;
}

export const ReceiptActions: React.FC<IReceiptActions> = ({ model }) => {
  const receipt = model.receipt;
  if (
    !receipt ||
    !model.canVerify ||
    !(model.isVerified || receipt.status === "unverified")
  )
    return null;
  return (
    <div className="flex shrink-0 flex-col gap-3 px-5">
      {model.verifyError ? (
        <InlineNotice tone="error">{model.verifyError}</InlineNotice>
      ) : null}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled
          title="Receipt editing is coming soon"
          className={`${actionClassName} cursor-not-allowed border border-hairline bg-surface-canvas text-ink`}
        >
          <IconEdit className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
          Edit Receipt
        </button>
        {model.isVerified ? (
          <button
            type="button"
            disabled
            title="Receipt deletion is coming soon"
            className={`${actionClassName} cursor-not-allowed bg-[#F6DEDA] text-[#A63B3B]`}
          >
            <IconTrash
              className="h-[18px] w-[18px] shrink-0"
              strokeWidth={1.5}
            />
            Delete Receipt
          </button>
        ) : (
          <button
            type="button"
            disabled={model.verifyPending || receipt.items.length === 0}
            aria-busy={model.verifyPending}
            aria-describedby="receipt-review-description"
            onClick={() => void model.verify()}
            className={`${actionClassName} pressable bg-brand-teal text-ink disabled:cursor-not-allowed disabled:opacity-45`}
          >
            <ReceiptStatusIcon
              verified
              className="h-[18px] w-[18px] shrink-0"
            />
            {model.verifyPending ? "Verifying…" : "Verify Receipt"}
          </button>
        )}
      </div>
    </div>
  );
};
