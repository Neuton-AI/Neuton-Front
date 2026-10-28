import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/feedback';
import { signedDownloadOptions, useSignedDownloadUrl } from '@/features/uploads/uploadsApi';
import type { DocumentSource } from '@/features/uploads/types';

type Context = { token: string | null; shopId: string | null };

function DocumentSourceView({ source, token, shopId }: Context & { source: DocumentSource }) {
  const queryClient = useQueryClient();
  const displayPath = source.preview?.storagePath ?? source.storagePath;
  const query = useSignedDownloadUrl(token, shopId, displayPath);
  const [imageFailed, setImageFailed] = useState(false);
  const [opening, setOpening] = useState(false);
  const [openFailed, setOpenFailed] = useState(false);
  const filename = source.originalFilename ?? 'document';
  const isPdfLink = !source.preview && source.contentType === 'application/pdf';
  const failed = query.isError || imageFailed;

  async function openOriginal() {
    // Open synchronously within the user's click so browsers permit the new tab.
    const target = window.open('about:blank', '_blank');
    if (target) target.opener = null;
    setOpening(true);
    setOpenFailed(false);
    try {
      const { url } = await queryClient.fetchQuery(
        signedDownloadOptions(token, shopId, source.storagePath),
      );
      if (target) target.location.href = url;
      else window.location.assign(url);
    } catch {
      target?.close();
      setOpenFailed(true);
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 break-all text-label text-ink-muted">{filename}</p>
        {!isPdfLink || failed ? (
          <button
            type="button"
            disabled={opening || !token || !shopId}
            aria-label={`View original ${filename}`}
            onClick={() => void openOriginal()}
            className="pressable min-h-10 shrink-0 text-label font-medium text-ink underline disabled:opacity-45"
          >
            {opening ? 'Opening…' : 'View original'}
          </button>
        ) : null}
      </div>
      <div className="flex h-[150px] items-center justify-center overflow-hidden rounded-card bg-surface-cream-strong">
        {failed ? (
          <p className="px-6 text-center text-label text-ink-muted">Preview could not be loaded.</p>
        ) : !query.data ? (
          <Skeleton className="h-full w-full rounded-none" />
        ) : isPdfLink ? (
          <a
            href={query.data.url}
            target="_blank"
            rel="noreferrer"
            className="pressable text-label font-medium text-ink underline"
          >
            Open {filename}
          </a>
        ) : (
          <img
            src={query.data.url}
            alt={filename}
            width={source.preview?.width}
            height={source.preview?.height}
            decoding="async"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-contain"
          />
        )}
      </div>
      {openFailed ? (
        <p role="alert" className="text-label text-ink-muted">
          The original could not be opened. Please try again.
        </p>
      ) : null}
    </div>
  );
}

export function DocumentSources({ sources, ...context }: Context & { sources: DocumentSource[] }) {
  return (
    <div className="flex flex-col gap-3">
      {sources.map((source) => (
        <DocumentSourceView
          key={`${source.sourceId}:${source.preview?.storagePath ?? source.storagePath}`}
          source={source}
          {...context}
        />
      ))}
    </div>
  );
}
