import type { DocumentSource } from '@/features/uploads/types';

export type ReceiptStatus = 'pending' | 'processing' | 'unverified' | 'verified' | 'failed';
export type Receipt = {
  id: string;
  shopId: string;
  uploadedBy: string | null;
  storagePath: string | null;
  contentType: string | null;
  originalFilename: string | null;
  merchantName: string | null;
  /** YYYY-MM-DD */
  receiptDate: string | null;
  totalAmount: string | null;
  taxAmount: string | null;
  currency: string | null;
  status: ReceiptStatus;
  errorMessage: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReceiptItem = {
  id: string;
  shopId: string;
  receiptId: string;
  inventoryItemId: string | null;
  rawName: string;
  rawMaterialName: string;
  rawSku: string | null;
  quantity: string | null;
  unitPrice: string | null;
  totalPrice: string | null;
  srcUnit: string | null;
  rawSrcUnit: string | null;
  srcUnitAmount: string | null;
  baseUnit: string | null;
  baseUnitAmount: string | null;
  confidence: string | null;
  createdAt: string;
};

export type ReceiptDetail = Receipt & {
  items: ReceiptItem[];
  sources?: DocumentSource[];
};

export type VerifyReceiptBody = {
  items: { id: string; accepted: boolean }[];
};

export type VerifyReceiptOutcome = {
  receiptId: string;
  status: 'verified';
  accepted: number;
  rejected: number;
};
