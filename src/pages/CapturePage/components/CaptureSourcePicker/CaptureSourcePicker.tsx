import type React from "react";
import { CaptureDialog } from "../CaptureDialog/CaptureDialog";
import type { CapturePageModel } from "../../CapturePage.module";

interface ICaptureSourcePicker extends Pick<
  CapturePageModel,
  "sourcePickerOpen" | "closeSourcePicker" | "chooseSource"
> {
  instant: boolean;
}

export const CaptureSourcePicker: React.FC<ICaptureSourcePicker> = ({
  sourcePickerOpen,
  closeSourcePicker,
  chooseSource,
  instant,
}) => {
  return (
    <CaptureDialog
      open={sourcePickerOpen}
      title="Choose upload source"
      className="capture-source-picker"
      instant={instant}
      onClose={closeSourcePicker}
    >
      <h2>Add a photo or file</h2>
      <p>Up to 4 sources · 10 MB each · 40 MB total</p>
      <button type="button" onClick={() => chooseSource("gallery")}>
        Photo gallery
      </button>
      <button type="button" onClick={() => chooseSource("file")}>
        Browse files
      </button>
      <button type="button" onClick={() => chooseSource("camera")}>
        Take a photo
      </button>
      <button
        type="button"
        className="capture-picker-cancel"
        onClick={closeSourcePicker}
      >
        Cancel
      </button>
    </CaptureDialog>
  );
};
