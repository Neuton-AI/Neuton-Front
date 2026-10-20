import {
  ALLOWED_CONTENT_TYPES,
  type GroupPresignResponse,
  type MediaKind,
  type PresignedUploadSource,
  type UploadCompleteResponse,
} from './types';
import type { UploadContext } from './upload';
import { apiFetch } from '@/lib/api';

export const MAX_UPLOAD_SOURCES = 4;
export const MAX_UPLOAD_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_TOTAL_BYTES = 40 * 1024 * 1024;

export type UploadSourceState = {
  file: File;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  error: string | null;
  presign: PresignedUploadSource | null;
};

export type UploadSession = {
  /** Kept even if the initial presign response is lost, so retries cannot create another document. */
  clientRequestId: string;
  kind: MediaKind;
  orderId?: string;
  uploadId: string | null;
  receiptId: string | null;
  recipeId: string | null;
  phase: 'presigning' | 'uploading' | 'queueing' | 'done' | 'failed';
  ratio: number | null;
  sources: UploadSourceState[];
  result?: UploadCompleteResponse;
};

type UploadSourcesOptions = {
  context: UploadContext;
  session?: UploadSession | null;
  onProgress?: (session: UploadSession) => void;
  orderId?: string;
};

export class UploadSourcesError extends Error {
  constructor(message: string, readonly session: UploadSession) {
    super(message);
    this.name = 'UploadSourcesError';
  }
}

export function validateUploadFiles(files: readonly File[]): string | null {
  if (files.length === 0) return 'Add at least one photo or file.';
  if (files.length > MAX_UPLOAD_SOURCES) return 'Add up to 4 photos or files per document.';
  for (const file of files) {
    if (!ALLOWED_CONTENT_TYPES.some((contentType) => contentType === file.type)) {
      return `${file.name}: choose a JPG, PNG, WebP, HEIC, or PDF file.`;
    }
    if (file.size === 0) return `${file.name} is empty. Choose another file.`;
    if (file.size > MAX_UPLOAD_FILE_BYTES) return `${file.name} exceeds the 10 MB file limit.`;
  }
  if (files.reduce((total, file) => total + file.size, 0) > MAX_UPLOAD_TOTAL_BYTES) {
    return 'The document exceeds the 40 MB total limit.';
  }
  return null;
}

/** Upload an ordered document; retrying its session preserves all successful PUTs. */
export async function uploadSources(
  files: readonly File[],
  kind: MediaKind,
  { context, session: previous, onProgress, orderId }: UploadSourcesOptions,
): Promise<UploadCompleteResponse> {
  const validationError = validateUploadFiles(files);
  if (validationError) throw new Error(validationError);
  if (previous && (
    previous.kind !== kind || previous.orderId !== orderId ||
    previous.sources.length !== files.length ||
    previous.sources.some((source, index) => source.file !== files[index])
  )) {
    throw new Error('This upload has already started. Retry with the same document sources.');
  }
  if (previous?.result) return previous.result;

  let session: UploadSession = previous
    ? { ...previous, sources: previous.sources.map((source) => ({ ...source })) }
    : {
        clientRequestId: crypto.randomUUID(),
        kind,
        ...(orderId ? { orderId } : {}),
        uploadId: null,
        receiptId: null,
        recipeId: null,
        phase: 'presigning',
        ratio: null,
        sources: files.map((file) => ({ file, status: 'pending', error: null, presign: null })),
      };

  // Every publication is a new snapshot so React and callers can retain prior states.
  function publish(update: Partial<UploadSession> = {}) {
    session = { ...session, ...update, sources: session.sources.map((source) => ({ ...source })) };
    onProgress?.({ ...session, sources: session.sources.map((source) => ({ ...source })) });
  }
  function uploadedRatio() {
    return session.sources.filter((source) => source.status === 'uploaded').length / files.length;
  }

  try {
    const pending = session.sources.filter((source) => source.status !== 'uploaded');
    if (pending.length > 0) {
      publish({ phase: 'presigning', ratio: uploadedRatio() });
      const presign = await apiFetch<GroupPresignResponse>('/uploads/presign', {
        method: 'POST',
        ...context,
        body: session.uploadId
          ? {
              uploadId: session.uploadId,
              ...(pending.every((source) => source.presign)
                ? { sourceIds: pending.map((source) => source.presign!.sourceId) }
                : {}),
            }
          : {
              clientRequestId: session.clientRequestId,
              kind,
              sources: files.map((file) => ({
                originalFilename: file.name,
                contentType: file.type,
                byteSize: file.size,
              })),
              ...(orderId ? { orderId } : {}),
            },
      });

      session.uploadId = presign.uploadId;
      session.receiptId = presign.receiptId;
      session.recipeId = presign.recipeId;
      for (let index = 0; index < session.sources.length; index += 1) {
        const source = session.sources[index];
        if (source.status === 'uploaded') continue;
        const signedSource = source.presign
          ? presign.sources.find((signed) => signed.sourceId === source.presign!.sourceId)
          : presign.sources[index];
        if (!signedSource) throw new Error('The server did not provide an upload link for every source.');
        source.presign = signedSource;
        source.error = null;
        source.status = 'pending';
      }
      publish({ phase: 'uploading', ratio: uploadedRatio() });

      for (let index = 0; index < session.sources.length; index += 1) {
        const source = session.sources[index];
        if (source.status === 'uploaded') continue;
        session.sources[index] = { ...source, status: 'uploading', error: null };
        publish({ phase: 'uploading', ratio: uploadedRatio() });
        try {
          const response = await fetch(source.presign!.uploadUrl, {
            method: presign.method,
            headers: { 'Content-Type': source.file.type },
            body: source.file,
          });
          if (!response.ok) throw new Error(`Upload to storage failed (${response.status}). Try again.`);
          session.sources[index] = { ...source, status: 'uploaded', error: null };
        } catch (error) {
          session.sources[index] = {
            ...source,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Upload failed. Try again.',
          };
        }
        publish({ ratio: uploadedRatio() });
      }
    }

    const failed = session.sources.filter((source) => source.status !== 'uploaded');
    if (failed.length > 0) {
      throw new Error(`${failed.length} ${failed.length === 1 ? 'source failed' : 'sources failed'} to upload. Retry to continue.`);
    }
    publish({ phase: 'queueing', ratio: 1 });
    const result = await apiFetch<UploadCompleteResponse>('/uploads/complete', {
      method: 'POST',
      ...context,
      body: { uploadId: session.uploadId },
    });
    if (!result.queued) {
      throw new Error('Your files uploaded, but processing is unavailable. Retry to submit this document.');
    }
    publish({ phase: 'done', ratio: 1, result });
    return result;
  } catch (error) {
    publish({ phase: 'failed', ratio: uploadedRatio() });
    throw new UploadSourcesError(error instanceof Error ? error.message : 'Upload failed. Try again.', session);
  }
}
