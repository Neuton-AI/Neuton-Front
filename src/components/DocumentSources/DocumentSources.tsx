import { Skeleton } from '@/components/feedback';
import type { DocumentSource } from '@/features/uploads/types';
import { useDocumentSource } from './DocumentSources.module';

type Context = { token: string | null; shopId: string | null };

function DocumentSourceView({ source, token, shopId }: Context & { source: DocumentSource }) {
  const preview = useDocumentSource({ source, token, shopId });
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 break-all text-label text-ink-muted">{preview.filename}</p>
        {!preview.isPdfLink || preview.failed ? (
          <button
            type="button"
            disabled={preview.opening || !preview.canOpen}
            aria-label={`View original ${preview.filename}`}
            onClick={() => void preview.openOriginal()}
            className="pressable min-h-10 shrink-0 text-label font-medium text-ink underline disabled:opacity-45"
          >
            {preview.opening ? 'Opening…' : 'View original'}
          </button>
        ) : null}
      </div>
      <div className="flex h-[150px] items-center justify-center overflow-hidden rounded-card bg-surface-cream-strong">
        {preview.failed ? (
          <p className="px-6 text-center text-label text-ink-muted">Preview could not be loaded.</p>
        ) : !preview.ready || !preview.url ? (
          <Skeleton className="h-full w-full rounded-none" />
        ) : preview.isPdfLink ? (
          <a href={preview.url} target="_blank" rel="noreferrer" className="pressable text-label font-medium text-ink underline">
            Open {preview.filename}
          </a>
        ) : (
          <img
            src={preview.url}
            alt={preview.filename}
            width={preview.width}
            height={preview.height}
            decoding="async"
            onError={preview.handleImageError}
            className="h-full w-full object-contain"
          />
        )}
      </div>
      {preview.openFailed ? (
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
