export type OrderStatus = 'processing' | 'delivered' | 'cancelled';

export type OrderableRecipe = {
  id: string;
  name: string;
  imageUrl: string | null;
  yieldQuantity: string;
  yieldUnit: string;
  unitCost: number;
  retailPrice: number;
};

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
  unitCost: string;
  unitPrice: string;
};

export type OrderDetailItem = {
  id: string;
  recipeId: string;
  name: string;
  quantity: string;
  unitCost: string;
  unitPrice: string;
};

export type OrderDetail = Order & { items: OrderDetailItem[] };

export type OrderQuoteItem = {
  recipeId: string;
  name: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  appliedProfitMargin: number;
  retailPrice: number;
};

export type OrderQuote = {
  items: OrderQuoteItem[];
  deliveryDistanceKm: number;
  baseFee: number;
  ratePerKm: number;
  totalCost: number;
  totalAmount: number;
  deliveryFee: number;
  netProfit: number;
  profitMarginPercent: number;
};

export type StatusFilter = 'all' | OrderStatus;
