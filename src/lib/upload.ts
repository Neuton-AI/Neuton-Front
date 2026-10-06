/**
 * Direct-to-R2 upload flow, matching the backend's three-step pipeline:
 *   1. POST /uploads/presign  -> short-lived presigned URL
 *   2. PUT the file straight to R2 (never through the API)
 *   3. POST /uploads/complete -> enqueues the Gemini extraction job
 */

import { apiFetch, type MediaKind, type PresignResponse, type UploadCompleteResponse } from './api';

export type UploadContext = {
  token: string | null;
  shopId: string | null;
};

export type UploadProgress = {
  phase: 'presigning' | 'uploading' | 'queueing' | 'done';
  /** 0-1 while the PUT is in flight; progress events are not available in fetch. */
  ratio: number | null;
};

export async function uploadMedia(
  file: File,
  kind: MediaKind,
  context: UploadContext,
  onProgress?: (progress: UploadProgress) => void,
  options: { orderId?: string } = {},
): Promise<UploadCompleteResponse> {
  onProgress?.({ phase: 'presigning', ratio: null });

  const presign = await apiFetch<PresignResponse>('/uploads/presign', {
    method: 'POST',
    token: context.token,
    shopId: context.shopId,
    body: {
      kind,
      contentType: file.type,
      originalFilename: file.name,
      byteSize: file.size,
      ...(options.orderId ? { orderId: options.orderId } : {}),
    },
  });

  onProgress?.({ phase: 'uploading', ratio: 0 });

  // Presigned URLs are single-use and already signed for this content type.
  const put = await fetch(presign.uploadUrl, {
    method: presign.method,
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!put.ok) {
    throw new Error(`Upload to storage failed (${put.status}). Try again.`);
  }
  onProgress?.({ phase: 'uploading', ratio: 1 });

  onProgress?.({ phase: 'queueing', ratio: null });

  const complete = await apiFetch<UploadCompleteResponse>('/uploads/complete', {
    method: 'POST',
    token: context.token,
    shopId: context.shopId,
    body: {
      storagePath: presign.storagePath,
      kind,
      contentType: file.type,
      originalFilename: file.name,
      ...(presign.receiptId ? { receiptId: presign.receiptId } : {}),
      ...(options.orderId ? { orderId: options.orderId } : {}),
    },
  });

  onProgress?.({ phase: 'done', ratio: 1 });
  return complete;
}