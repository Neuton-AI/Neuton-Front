import type React from "react";
import type { CapturePageModel } from "../../CapturePage.module";

const ACCEPTED = "image/jpeg,image/png,image/webp,image/heic,application/pdf";

interface ICaptureFileInputs extends Pick<
  CapturePageModel,
  | "galleryInputRef"
  | "fileInputRef"
  | "nativeCameraInputRef"
  | "handleFileInput"
> {
  galleryInputRef: Pick<
    CapturePageModel,
    | "galleryInputRef"
    | "fileInputRef"
    | "nativeCameraInputRef"
    | "handleFileInput"
  >["galleryInputRef"];
}

export const CaptureFileInputs: React.FC<ICaptureFileInputs> = ({
  galleryInputRef,
  fileInputRef,
  nativeCameraInputRef,
  handleFileInput,
}) => {
  return (
    <>
      <input
        ref={galleryInputRef}
        type="file"
        aria-label="Choose photos from gallery"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        hidden
        onChange={handleFileInput}
      />
      <input
        ref={fileInputRef}
        type="file"
        aria-label="Choose document files"
        accept={ACCEPTED}
        multiple
        hidden
        onChange={handleFileInput}
      />
      <input
        ref={nativeCameraInputRef}
        type="file"
        aria-label="Take a photo with device camera"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleFileInput}
      />
    </>
  );
};
