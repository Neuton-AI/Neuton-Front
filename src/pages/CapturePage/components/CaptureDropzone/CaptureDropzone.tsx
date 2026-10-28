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
      className="capture-dropzone"
      disabled={locked || total >= 4}
      onClick={handleBrowse}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <IconUpload className="h-[22px] w-[22px]" />
      <strong>Drop a file here or browse</strong>
      <span>Supported files · JPG, PNG, WebP, HEIC, PDF</span>
      <span>Up to 4 files · 10 MB each · 40 MB total</span>
    </button>
  );
};
