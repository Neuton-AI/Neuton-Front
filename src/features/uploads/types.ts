export type PresignResponse = {
  uploadUrl: string;
  storagePath: string;
  receiptId: string | null;
  method: 'PUT';
  expiresIn: number;
};

export type UploadCompleteResponse = {
  receiptId: string | null;
  recipeId: string | null;
  queued: boolean;
  jobId: string | null;
  reason?: string;
};

export type MediaKind = 'receipt' | 'recipe' | 'product' | 'order';

export const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
] as const;
