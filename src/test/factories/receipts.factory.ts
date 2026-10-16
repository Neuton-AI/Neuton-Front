import type { ReceiptDetail, ReceiptStatus } from '@/features/receipts/types';
function makeReceiptDetail(status: ReceiptStatus): ReceiptDetail {
  return {
    id: 'rc-1',
    shopId: 'shop-1',
    uploadedBy: 'u1',
    storagePath: 'receipts/rc-1.png',
    contentType: 'image/png',
    originalFilename: 'rc-1.png',
    merchantName: 'Corner Market',
    receiptDate: '2026-02-10',
    totalAmount: '42.50',
    taxAmount: '3.20',
    currency: 'USD',
    status,
    errorMessage: null,
    processedAt: null,
    createdAt: '2026-02-10T09:00:00.000Z',
    updatedAt: '2026-02-10T09:00:00.000Z',
    items: [
      {
        id: 'li-1',
        shopId: 'shop-1',
        receiptId: 'rc-1',
        inventoryItemId: status === 'verified' ? 'inv-1' : null,
        rawName: 'Flour',
        rawMaterialName: 'Wheat flour',
        rawSku: null,
        quantity: '2',
        unitPrice: '1.50',
        totalPrice: '3.00',
        srcUnit: 'kg',
        rawSrcUnit: 'kg',
        srcUnitAmount: null,
        baseUnit: null,
        baseUnitAmount: null,
        confidence: '0.92',
        createdAt: '2026-02-10T09:00:00.000Z',
      },
    ],
  };
}
export function buildReceiptDetail(overrides: Partial<ReceiptDetail> = {}): ReceiptDetail {
  return { ...makeReceiptDetail('unverified'), ...overrides };
}
