import {
  ALLOWED_CONTENT_TYPES,
  type GroupPresignResponse,
  type MediaKind,
  type PresignedUploadSource,
  type UploadCompleteResponse,
} from './types';
import type { UploadContext } from './upload';
import { apiFetch, ApiError } from '@/lib/api';

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
  persistProgress?: (session: UploadSession) => Promise<void>;
  orderId?: string;
};

export class UploadSourcesError extends Error {
  constructor(
    message: string,
    readonly session: UploadSession,
    readonly cause?: unknown,
    readonly failures: {
      error: unknown;
      phase: 'presign' | 'storage-put' | 'completion' | 'local-persistence';
      sourceIndex: number | null;
      sourceId: string | null;
    }[] = [],
  ) {
    super(message);
    this.name = 'UploadSourcesError';
  }
}

export function validateUploadFiles(files: readonly File[]): string | null {
  if (files.length === 0) return 'Add files';
  if (files.length > MAX_UPLOAD_SOURCES) return '4 files maximum';
  for (const file of files) {
    if (
      !ALLOWED_CONTENT_TYPES.some((contentType) => contentType === file.type)
    ) {
      return 'Unsupported format';
    }
    if (file.size === 0) return 'Empty file';
    if (file.size > MAX_UPLOAD_FILE_BYTES) return 'File oversized';
  }
  if (
    files.reduce((total, file) => total + file.size, 0) > MAX_UPLOAD_TOTAL_BYTES
  ) {
    return 'Document oversized';
  }
  return null;
}

/** Upload an ordered document; retrying its session preserves all successful PUTs. */
export async function uploadSources(
  files: readonly File[],
  kind: MediaKind,
  {
    context,
    session: previous,
    onProgress,
    persistProgress,
    orderId,
  }: UploadSourcesOptions,
): Promise<UploadCompleteResponse> {
  const validationError = validateUploadFiles(files);
  if (validationError) throw new Error(validationError);
  if (
    previous &&
    (previous.kind !== kind ||
      previous.orderId !== orderId ||
      previous.sources.length !== files.length ||
      previous.sources.some((source, index) => source.file !== files[index]))
  ) {
    throw new Error('Sources changed');
  }
  if (previous?.result) return previous.result;

  let session: UploadSession = previous
    ? {
        ...previous,
        sources: previous.sources.map((source) => ({ ...source })),
      }
    : {
        clientRequestId: crypto.randomUUID(),
        kind,
        ...(orderId ? { orderId } : {}),
        uploadId: null,
        receiptId: null,
        recipeId: null,
        phase: 'presigning',
        ratio: null,
        sources: files.map((file) => ({
          file,
          status: 'pending',
          error: null,
          presign: null,
        })),
      };

  // Every publication is a new snapshot so React and callers can retain prior states.
  async function publish(update: Partial<UploadSession> = {}) {
    session = {
      ...session,
      ...update,
      sources: session.sources.map((source) => ({ ...source })),
    };
    onProgress?.({
      ...session,
      sources: session.sources.map((source) => ({ ...source })),
    });
    try {
      await persistProgress?.(session);
    } catch (error) {
      failures.push({
        error,
        phase: 'local-persistence',
        sourceId: null,
        sourceIndex: null,
      });
      throw error;
    }
  }
  function uploadedRatio() {
    return (
      session.sources.filter((source) => source.status === 'uploaded').length /
      files.length
    );
  }
  let phase: 'presign' | 'storage-put' | 'completion' = 'presign';
  const failures: UploadSourcesError['failures'] = [];

  try {
    const pending = session.sources.filter(
      (source) => source.status !== 'uploaded',
    );
    if (pending.length > 0) {
      await publish({ phase: 'presigning', ratio: uploadedRatio() });
      const presign = await apiFetch<GroupPresignResponse>('/uploads/presign', {
        method: 'POST',
        ...context,
        body: session.uploadId
          ? {
              uploadId: session.uploadId,
              ...(pending.every((source) => source.presign)
                ? {
                    sourceIds: pending.map(
                      (source) => source.presign!.sourceId,
                    ),
                  }
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
          ? presign.sources.find(
              (signed) => signed.sourceId === source.presign!.sourceId,
            )
          : presign.sources[index];
        if (!signedSource)
          throw new Error(
            'The server did not provide an upload link for every source.',
          );
        source.presign = signedSource;
        source.error = null;
        source.status = 'pending';
      }
      await publish({ phase: 'uploading', ratio: uploadedRatio() });
      phase = 'storage-put';

      for (let index = 0; index < session.sources.length; index += 1) {
        const source = session.sources[index];
        if (source.status === 'uploaded') continue;
        session.sources[index] = {
          ...source,
          status: 'uploading',
          error: null,
        };
        await publish({ phase: 'uploading', ratio: uploadedRatio() });
        try {
          const response = await fetch(source.presign!.uploadUrl, {
            method: presign.method,
            headers: { 'Content-Type': source.file.type },
            body: source.file,
          });
          if (!response.ok)
            throw new ApiError('Storage upload failed', response.status);
          session.sources[index] = {
            ...source,
            status: 'uploaded',
            error: null,
          };
        } catch (error) {
          failures.push({
            error,
            phase: 'storage-put',
            sourceIndex: index,
            sourceId: source.presign?.sourceId ?? null,
          });
          session.sources[index] = {
            ...source,
            status: 'failed',
            error: 'Upload failed',
          };
        }
        await publish({ ratio: uploadedRatio() });
      }
    }

    const failed = session.sources.filter(
      (source) => source.status !== 'uploaded',
    );
    if (failed.length > 0) {
      throw new Error('Upload failed');
    }
    await publish({ phase: 'queueing', ratio: 1 });
    phase = 'completion';
    const result = await apiFetch<UploadCompleteResponse>('/uploads/complete', {
      method: 'POST',
      ...context,
      body: { uploadId: session.uploadId },
    });
    if (!result.queued) {
      throw new Error(
        'Your files uploaded, but processing is unavailable. Retry to submit this document.',
      );
    }
    await publish({ phase: 'done', ratio: 1, result });
    return result;
  } catch (error) {
    if (!failures.length)
      failures.push({ error, phase, sourceIndex: null, sourceId: null });
    await publish({ phase: 'failed', ratio: uploadedRatio() }).catch(
      () => undefined,
    );
    throw new UploadSourcesError('Upload failed', session, error, failures);
  }
}
