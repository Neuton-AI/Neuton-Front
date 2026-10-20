export type PresignResponse = {
  uploadUrl: string;
  storagePath: string;
  receiptId: string | null;
  method: 'PUT';
  expiresIn: number;
};

export type UploadCompleteResponse = {
  uploadId?: string;
  receiptId: string | null;
  recipeId: string | null;
  queued: boolean;
  jobId: string | null;
  reason?: string;
};

export type PresignedUploadSource = {
  sourceId: string;
  storagePath: string;
  uploadUrl: string;
  contentType: string;
  originalFilename: string;
  byteSize: number;
};

export type GroupPresignResponse = {
  uploadId: string;
  receiptId: string | null;
  recipeId: string | null;
  sources: PresignedUploadSource[];
  method: 'PUT';
  expiresIn: number;
};

export type MediaKind = 'receipt' | 'recipe' | 'product' | 'order';

export const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
] as const;
