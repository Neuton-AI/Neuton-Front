import type React from "react";
import {
  CaptureAction,
  CaptureIcon,
} from "../../CaptureAction/CaptureAction";
import type { CaptureSource } from "../../../CapturePage.module";

interface ICaptureReviewActions {
  selected: CaptureSource | null;
  reviewIndex: number | null;
  count: number;
  disabled: boolean;
  deleteSource: (id: string) => void;
  replaceSource: (id: string) => void;
  moveSource: (id: string, direction: -1 | 1) => void;
}

export const CaptureReviewActions: React.FC<ICaptureReviewActions> = ({
  selected,
  reviewIndex,
  count,
  disabled,
  deleteSource,
  replaceSource,
  moveSource,
}) => {
  return (
    <>
      <div className="capture-review-actions">
        <CaptureAction
          label="Delete"
          disabled={!selected || disabled}
          onClick={() => {
            if (selected) deleteSource(selected.id);
          }}
        >
          <CaptureIcon kind="delete" />
        </CaptureAction>
        <CaptureAction
          label="Replace"
          disabled={!selected || disabled}
          onClick={() => {
            if (selected) replaceSource(selected.id);
          }}
        >
          <CaptureIcon kind="replace" />
        </CaptureAction>
      </div>
      <div className="capture-reorder" aria-label="Reorder source">
        <button
          type="button"
          disabled={reviewIndex === 0 || disabled}
          onClick={() => {
            if (selected) moveSource(selected.id, -1);
          }}
        >
          Move earlier
        </button>
        <button
          type="button"
          disabled={reviewIndex === count - 1 || disabled}
          onClick={() => {
            if (selected) moveSource(selected.id, 1);
          }}
        >
          Move later
        </button>
      </div>
    </>
  );
};
