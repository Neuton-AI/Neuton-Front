import type { DocumentSource } from '@/features/uploads/types';

export type OrderStatus = 'processing' | 'delivered' | 'cancelled';

export type Order = {
  id: string;
  /**
   * Per-shop sequential invoice number, issued by the server at creation:
   * unique per shop, never reused, so an order that was cancelled keeps the
   * number it was printed with instead of leaving a hole.
   */
  orderNumber: number;
  shopId: string;
  userId: string | null;
  customerName: string | null;
  orderDate: string;
  /** Missing/null on legacy local snapshots means historically unknown. */
  deliveryDate?: string | null;
  destinationAddress: string | null;
  deliveryDistanceKm: string;
  deliveryFee: string;
  appliedProfitMargin: string | null;
  totalCost: string;
  totalAmount: string;
  documentUrl: string | null;
  status: OrderStatus;
  netProfit: number;
  createdAt: string;
};

export type OrderItem = {
  id: string;
  orderId: string;
  recipeId: string;
  quantity: string;
  costComplete?: boolean | null;
  unitCost: string;
  unitPrice: string;
};

export type OrderDetailItem = {
  id: string;
  recipeId: string;
  name: string;
  quantity: string;
  costComplete?: boolean | null;
  unitCost: string;
  unitPrice: string;
};

export type OrderDetail = Order & {
  items: OrderDetailItem[];
  sources?: DocumentSource[];
};

export type StatusFilter = 'all' | OrderStatus;

export type OrderReviewDetails = {
  reasons: ('PRICE_CHANGED' | 'AVAILABILITY_CHANGED')[];
  unavailable: { recipeId: string; reason: 'NOT_FOUND' | 'INACTIVE' | 'UNVERIFIED' }[];
  priceChanges: { recipeId: string; name: string; expectedUnitPrice: string; currentUnitPrice: string }[];
  currentItems: { recipeId: string; name: string; unitPrice: string; costComplete: boolean }[];
};

export type ReviewedCreateOrderBody = {
  customerName: string;
  orderDate: string;
  deliveryDate: string;
  destinationAddress: string;
  deliveryFee: string | number;
  deliveryDistanceKm?: never;
  items: { recipeId: string; quantity: number; expectedUnitPrice: string; unitPrice?: never }[];
  confirmedUnavailableRecipeIds?: string[];
};

export type UpdateOrderBody = Partial<Pick<ReviewedCreateOrderBody,
  'customerName' | 'destinationAddress' | 'orderDate'>> & {
  deliveryDate?: string | null;
  deliveryFee: string;
  items: ({ lineId: string; quantity: number } | ReviewedCreateOrderBody['items'][number])[];
  confirmedUnavailableRecipeIds?: string[];
};

export type OrderEditSnapshot = { order: OrderDetail; syncVersion: number };
