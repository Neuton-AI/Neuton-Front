import type React from "react";
import type { CapturePageModel } from "../../CapturePage.module";
import { SourcePreview } from "../SourcePreview/SourcePreview";

interface ICaptureViewport extends Pick<
  CapturePageModel,
  | "current"
  | "stacked"
  | "previewRef"
  | "videoRef"
  | "handleFocus"
  | "busy"
  | "adding"
  | "openCurrentReview"
  | "openReview"
> {
  current: Pick<
    CapturePageModel,
    | "current"
    | "stacked"
    | "previewRef"
    | "videoRef"
    | "handleFocus"
    | "busy"
    | "adding"
    | "openCurrentReview"
    | "openReview"
  >["current"];
}

export const CaptureViewport: React.FC<ICaptureViewport> = ({
  current,
  stacked,
  previewRef,
  videoRef,
  handleFocus,
  busy,
  adding,
  openCurrentReview,
  openReview,
}) => {
  return (
    <div className="capture-preview-area">
      <div className="capture-preview" ref={previewRef}>
        {current ? (
          <SourcePreview key={current.id} source={current} />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="capture-video"
              onPointerDown={(event) =>
                handleFocus(event.clientX, event.clientY)
              }
            />
            <span className="capture-guide capture-guide--tl" />
            <span className="capture-guide capture-guide--tr" />
            <span className="capture-guide capture-guide--bl" />
            <span className="capture-guide capture-guide--br" />
          </>
        )}
      </div>
      {current && (
        <button
          type="button"
          className="capture-inspect"
          aria-label="Review current document"
          disabled={busy || adding}
          onClick={openCurrentReview}
        />
      )}
      <button
        type="button"
        data-capture-stack
        className="capture-stack"
        hidden={!stacked.length}
        aria-label={`Review ${stacked.length} saved ${stacked.length === 1 ? "source" : "sources"}`}
        disabled={busy || adding}
        onClick={() => openReview()}
      >
        {stacked
          .slice(0, 2)
          .reverse()
          .map((source, index) => (
            <span
              key={source.id}
              className={`capture-stack-card ${stacked.length > 1 && index === 0 ? "capture-stack-card--back" : ""}`}
            >
              <SourcePreview source={source} thumbnail />
            </span>
          ))}
        <span className="capture-stack-count">{stacked.length}</span>
      </button>
    </div>
  );
};
