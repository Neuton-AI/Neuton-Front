import type React from "react";
import { IconWarning } from "@/components/icons";

interface IDeleteShopDialog {
  open: boolean;
  shopName: string;
  typedName: string;
  message: string | null;
  pending: boolean;
  confirmDisabled: boolean;
  onTypedName: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteShopDialog: React.FC<IDeleteShopDialog> = ({
  open,
  shopName,
  typedName,
  message,
  pending,
  confirmDisabled,
  onTypedName,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="Close"
        onClick={onCancel}
        className="absolute inset-0 bg-surface-dark/45"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-shop-title"
        aria-describedby="delete-shop-description"
        className="relative flex w-full max-w-[400px] flex-col gap-4 rounded-[16px] border border-hairline bg-[#FFFFFF] p-6 shadow-[0_20px_50px_rgba(20,20,19,0.18)]"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-[#FEF3C7] text-ink">
          <IconWarning className="h-[22px] w-[22px]" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 id="delete-shop-title" className="text-[20px] font-bold leading-[1.2] text-ink">
            Delete this shop?
          </h2>
          <p id="delete-shop-description" className="text-[14px] leading-[1.5] text-ink-muted">
            Deleting {shopName} is dangerous and cannot be undone. The shop and everything in it are removed.
          </p>
        </div>
        <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-ink" htmlFor="delete-shop-name">
          Type the shop name to confirm
          <input
            id="delete-shop-name"
            value={typedName}
            autoComplete="off"
            onChange={(event) => onTypedName(event.target.value)}
            className="h-11 rounded-[10px] border border-hairline px-3 text-[14px] font-normal text-ink"
          />
        </label>
        {message ? <p className="text-[14px] text-ink">{message}</p> : null}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-[10px] border border-hairline text-[14px] font-semibold text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled || pending}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-[10px] bg-[#9A3412] text-[14px] font-semibold text-white disabled:opacity-40"
          >
            {pending ? "Deleting…" : "Delete shop"}
          </button>
        </div>
      </div>
    </div>
  );
};
