import { InlineNotice } from "@/components/feedback";
import { IconEdit } from "@/components/icons";
import { VerificationStatusIcon } from "@/components/VerificationStatus/VerificationStatus";
import type { OrderDetailPageModel } from "../../OrderDetailPage.module";

const actionClassName =
  "inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-1 rounded-card px-1 text-body font-semibold min-[360px]:gap-2";
const iconClassName = "h-[18px] w-[18px] shrink-0";

export function OrderActions({ model }: { model: OrderDetailPageModel }) {
  const status = model.order?.status;
  if (status === "delivered") {
    if (!model.canEdit) return null;
    return (
      <div className="shrink-0 px-5">
        <div role="group" aria-label="Order actions" className="flex border-t border-hairline-soft pt-3">
          <button
            type="button"
            onClick={model.openUndo}
            className={`${actionClassName} pressable border border-hairline bg-surface-canvas text-ink`}
          >
            Undo delivery
          </button>
        </div>
      </div>
    );
  }
  if (status !== "processing") return null;

  const actionPending = model.deleteOrderPending || model.markOrderPending;

  return (
    <div className="shrink-0 px-5">
      <div className="flex flex-col gap-3 border-t border-hairline-soft pt-3">
        {model.markError ? (
          <InlineNotice tone="error">{model.markError}</InlineNotice>
        ) : null}
        <div role="group" aria-label="Order actions" className="flex gap-3">
          <button
            type="button"
            className={`${actionClassName} pressable bg-[#F6DEDA] text-[#A63B3B] disabled:opacity-45`}
            disabled={actionPending}
            aria-busy={model.deleteOrderPending}
            onClick={() => model.setConfirmingDelete(true)}
          >
            <svg
              aria-hidden="true"
              className={iconClassName}
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 4l4 2 4-2 4 2 4-2-2 7 2 7-2 6 2 7-2 7 2 6-4-2-4 2-4-2-4 2Z M17 16h-1a4 4 0 0 0 0 8h1m0 8h-5" />
              <path
                transform="rotate(9 28 37)"
                d="M28 4l4 2 4-2 4 2 4-2v40l-4-2-4 2-4-2-4 2-2-6 2-7-2-7 2-6-2-7 2-7Z M31 16h6m-6 8h2a4 4 0 0 1 0 8h-2"
              />
            </svg>
            Cancel
          </button>
          <button
            type="button"
            disabled={!model.canEdit || actionPending}
            onClick={model.edit}
            className={`${actionClassName} pressable border border-hairline bg-surface-canvas text-ink disabled:cursor-not-allowed disabled:opacity-45`}
          >
            <IconEdit className={iconClassName} strokeWidth={1.5} />
            Edit
          </button>
          <button
            type="button"
            className={`${actionClassName} pressable bg-brand-teal text-ink disabled:opacity-45`}
            disabled={actionPending}
            aria-busy={model.markOrderPending}
            onClick={model.markDelivered}
          >
            <VerificationStatusIcon verified className={iconClassName} />
            Deliver
          </button>
        </div>
      </div>
    </div>
  );
}
