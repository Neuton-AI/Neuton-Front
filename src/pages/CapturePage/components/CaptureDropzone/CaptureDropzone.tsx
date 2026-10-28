import type React from "react";
import { IconUpload } from "../IconUpload/IconUpload";
import type { CapturePageModel } from "../../CapturePage.module";

interface ICaptureDropzone extends Pick<
  CapturePageModel,
  "locked" | "total" | "handleBrowse" | "handleDrop"
> {
  locked: Pick<
    CapturePageModel,
    "locked" | "total" | "handleBrowse" | "handleDrop"
  >["locked"];
}

export const CaptureDropzone: React.FC<ICaptureDropzone> = ({
  locked,
  total,
  handleBrowse,
  handleDrop,
}) => {
  return (
    <button
      type="button"
      className="capture-action capture-upload"
      aria-label="Upload"
      disabled={locked || total >= 4}
      onClick={handleBrowse}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <span className="capture-action-circle">
        <IconUpload className="h-[17px] w-[17px]" aria-hidden="true" />
      </span>
      <span>Upload</span>
    </button>
  );
};
