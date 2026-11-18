import { useState } from "react";

export function CatalogThumbnail({
  imageUrl,
  receipt = false,
}: {
  imageUrl?: string | null;
  receipt?: boolean;
}) {
  return <Thumbnail key={imageUrl} imageUrl={imageUrl} receipt={receipt} />;
}

function Thumbnail({
  imageUrl,
  receipt,
}: {
  imageUrl?: string | null;
  receipt: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const placeholder = receipt ? (
    <svg
      width="27"
      height="27"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 1.25v12.5l1.875-1.25 1.875 1.25 1.875-1.25L10 13.75l1.875-1.25V1.25L10 2.5 8.125 1.25 6.25 2.5 4.375 1.25H2.5Z" />
      <path d="M5 5h5M5 7.5h5" />
    </svg>
  ) : (
    <svg
      width="27"
      height="27"
      viewBox="0 0 27 27"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.375" y="3.375" width="20.25" height="20.25" rx="2.25" />
      <circle cx="9.5625" cy="9.5625" r="1.6875" />
      <path d="m23.625 16.875-5.625-5.625-12.375 12.375" />
    </svg>
  );
  return (
    <div
      className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-input bg-surface-cream-strong text-ink-muted-soft"
      aria-hidden="true"
    >
      {imageUrl && !failed ? (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        placeholder
      )}
    </div>
  );
}
