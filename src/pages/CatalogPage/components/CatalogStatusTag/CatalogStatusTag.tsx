import type { ReceiptStatus } from "@/features/receipts/types";
import { CatalogStatusIcon } from "./CatalogStatusIcon";
import { useCatalogStatusTag } from "./CatalogStatusTag.module";
import "./CatalogStatusTag.css";

export type CatalogStatus = ReceiptStatus | "uploading";

const LABELS: Record<CatalogStatus, string> = {
  uploading: "Uploading",
  pending: "Pending",
  processing: "Processing",
  unverified: "Unverified",
  verified: "Verified",
  failed: "Failed",
};

export function CatalogStatusTag({ status }: { status: CatalogStatus }) {
  return <StatusTag key={status} status={status} />;
}

function StatusTag({ status }: { status: CatalogStatus }) {
  const { expanded, labelWidth, labelRef, toggle, handleTransitionEnd } =
    useCatalogStatusTag();
  const label = LABELS[status];

  return (
    <button
      type="button"
      aria-label={`Status: ${label}`}
      aria-expanded={expanded}
      className={`catalog-status-tag catalog-status-tag--${status}`}
      data-expanded={expanded}
      style={{ width: expanded ? labelWidth + 46 : 24 }}
      onClick={toggle}
      onTransitionEnd={handleTransitionEnd}
    >
      <span className="catalog-status-tag__label" aria-hidden="true">
        <span ref={labelRef}>{label}</span>
      </span>
      <CatalogStatusIcon status={status} />
    </button>
  );
}
