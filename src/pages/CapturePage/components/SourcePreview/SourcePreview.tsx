import type React from "react";
import { useState } from "react";

export type PreviewSource = {
  id: string;
  file: File;
  previewUrl: string | null;
};

interface ISourcePreview {
  source: PreviewSource;
  thumbnail?: boolean;
}

export const SourcePreview: React.FC<ISourcePreview> = ({
  source,
  thumbnail = false,
}) => {
  const [failed, setFailed] = useState(false);
  if (source.previewUrl && !failed)
    return (
      <img
        src={source.previewUrl}
        alt={thumbnail ? "" : "Selected document preview"}
        className="capture-source-image"
        onError={() => setFailed(true)}
      />
    );
  return (
    <div
      className={`capture-file-card${thumbnail ? " capture-file-card--small" : ""}`}
    >
      <svg
        width="40"
        height="48"
        viewBox="0 0 40 48"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M8 2h16l12 12v32H4V2h4Z M24 2v14h12 M12 27h16 M12 34h16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <span>{source.file.type === "application/pdf" ? "PDF" : "Image"}</span>
      {!thumbnail && (
        <>
          <strong>{source.file.name}</strong>
          <small>
            {(source.file.size / 1024 / 1024).toFixed(1)} MB · Ready to send
          </small>
        </>
      )}
    </div>
  );
};
