import type React from "react";
import { useState } from "react";
import { ErrorState } from "@/components/feedback";
import { useCapturePage } from "./CapturePage.module";
import { CaptureControls } from "./components/CaptureControls/CaptureControls";
import { CaptureDropzone } from "./components/CaptureDropzone/CaptureDropzone";
import { CaptureFileInputs } from "./components/CaptureFileInputs/CaptureFileInputs";
import { CaptureHeader } from "./components/CaptureHeader/CaptureHeader";
import { CaptureKinds } from "./components/CaptureKinds/CaptureKinds";
import { CaptureReview } from "./components/CaptureReview/CaptureReview";
import { CaptureSourcePicker } from "./components/CaptureSourcePicker/CaptureSourcePicker";
import { CaptureViewport } from "./components/CaptureViewport/CaptureViewport";
import "./CapturePage.css";

export const CapturePage: React.FC = () => {
  const model = useCapturePage();
  const [instant, setInstant] = useState(false);
  return (
    <main
      className="capture-page"
      data-keyboard={instant || undefined}
      onPointerDownCapture={() => setInstant(false)}
      onKeyDownCapture={() => setInstant(true)}
    >
      <div className="capture-layout">
        <CaptureHeader
          disabled={model.busy || model.adding}
          onClose={model.handleClose}
        />
        <CaptureViewport {...model} />
        <CaptureKinds
          kind={model.kind}
          disabled={model.total > 0 || model.locked}
          onSelect={model.setKind}
        />
        <CaptureControls {...model} instant={instant} />
        <div className="capture-feedback" aria-live="polite">
          {model.error && <ErrorState message={model.error} />}
          {model.total >= 4 && !model.busy && (
            <p>4 of 4 sources. Send your document or review to make changes.</p>
          )}
        </div>
        <CaptureDropzone {...model} />
      </div>
      <CaptureFileInputs {...model} />
      <CaptureSourcePicker {...model} instant={instant} />
      <CaptureReview model={model} instant={instant} setInstant={setInstant} />
    </main>
  );
};
