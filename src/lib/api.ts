/**
 * Typed API client for the Neuton Fastify backend.
 *
 * Auth is a Supabase JWT; the active shop travels in `x-shop-id` because the
 * API resolves shop membership server-side from that header.
 *
 * The Faro trace id travels as `x-trace-id` so a browser session, the API log
 * lines and any worker jobs it triggers share one correlation id. Faro is
 * optional: before it initializes (or if it fails) the backend simply starts a
 * fresh trace of its own.
 */

import { faro } from '@grafana/faro-web-sdk';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  shopId?: string | null;
  signal?: AbortSignal;
};

/**
 * The backend wraps every failure as `{ error: { code, message } }`. Flat
 * `{ message }` and bare-string `error` bodies are tolerated so a proxy or a
 * future endpoint change degrades to a real message instead of the string
 * `[object Object]`.
 */
function readError(payload: unknown, status: number): { message: string; code?: string } {
  const fallback = `Request failed (${status})`;
  if (typeof payload !== 'object' || payload === null) return { message: fallback };

  const top = payload as { message?: unknown; error?: unknown; code?: unknown };
  const topCode = typeof top.code === 'string' ? top.code : undefined;

  if (typeof top.message === 'string' && top.message.length > 0) {
    return { message: top.message, code: topCode };
  }
  if (typeof top.error === 'string' && top.error.length > 0) {
    return { message: top.error, code: topCode };
  }
  if (typeof top.error === 'object' && top.error !== null) {
    const nested = top.error as { message?: unknown; code?: unknown };
    if (typeof nested.message === 'string' && nested.message.length > 0) {
      return {
        message: nested.message,
        code: typeof nested.code === 'string' ? nested.code : topCode,
      };
    }
  }
  return { message: fallback };
}

export async function apiFetch<T>(
  path: string,
  { method = 'GET', body, token, shopId, signal }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (shopId) headers['x-shop-id'] = shopId;
  const traceId = faro.api.getTraceContext()?.trace_id;
  if (traceId) headers['x-trace-id'] = traceId;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }

  if (response.status === 204) return undefined as T;

  // A non-JSON body (HTML from a proxy, empty 502) must not throw out of
  // JSON.parse, which would surface as an unhandled SyntaxError.
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const { message, code } = readError(payload, response.status);
    throw new ApiError(message, response.status, code);
  }

  return payload as T;
}

export type { RequestOptions };

/* ------------------------------------------------------------------ */
/* Response shapes                                                     */
/* ------------------------------------------------------------------ */

export type ReceiptStatus = 'pending' | 'processing' | 'unverified' | 'verified' | 'failed';

export type RecipeStatus = 'pending' | 'processing' | 'unverified' | 'verified' | 'failed';

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

export type MeasurementState = 'ready' | 'estimated' | 'unresolved';

export type ReceiptItem = {
  rawSku?: string | null;
  codeChain?: string | null;
  packageQuantity?: string | null;
  packageUnit?: string | null;
  packagesPerPurchase?: string | null;
  normalizedQuantity?: string | null;
  normalizedUnit?: string | null;
  normalizedRate?: string | null;
  measurementStatus?: MeasurementState;
  measurementReason?: string | null;
  applicationStatus?: string;
  reviewStatus?: string;
  id: string;
  shopId: string;
  receiptId: string;
  inventoryItemId: string | null;
  rawName: string;
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

/** GET /receipts/:id nests the extracted lines under the receipt. */
export type ReceiptDetail = Receipt & { items: ReceiptItem[] };

/** Body of POST /receipts/:id/verify: one verdict per extracted line. */
export type VerifyReceiptBody = {
  items: { id: string; accepted: boolean; rawName?: string; rawSku?: string; codeChain?: 'shufersal' | 'carrefour'; quantity?: number; unit?: string;
    unitPrice?: number; totalPrice?: number; packageQuantity?: number; packageUnit?: 'g' | 'kg' | 'ml' | 'l' | 'each'; packagesPerPurchase?: number;
    discountConfirmed?: boolean; saveProductMeasurement?: boolean }[];
};

/** Response of POST /receipts/:id/verify. */
export type VerifyReceiptOutcome = {
  receiptId: string;
  status: 'verified';
  accepted: number;
  rejected: number;
};

export type InventoryItem = {
  measurementStatus?: string;
  id: string;
  shopId: string;
  categoryId: string | null;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  unit: string;
  baseUnit: string;
  baseUnitAmount: string;
  baseUnitCost: string;
  currentQuantity: string;
  reorderLevel: string | null;
  lastUnitCost: string | null;
  averageUnitCost: string | null;
  isActive: boolean;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
};

/** One recipe line as costed against live inventory. */
export type RecipeIngredient = {
  id?: string;
  measurementState?: MeasurementState;
  measurementReason?: string | null;
  normalizedQuantity?: number | null;
  normalizedUnit?: string | null;
  priceBasis?: string;
  explanation?: string | null;
  provenance?: string[];
  alternateMeasurements?: { quantity: number | null; unit: string | null }[];
  convention?: 'us' | 'metric' | 'imperial' | null;
  alternatives?: string[];
  selectedAlternative?: string | null;
  name: string;
  quantity: number | null;
  unit: string | null;
  averageUnitCost: number | null;
  lineCost: number | null;
  currentQuantity: number | string | null;
  /** Inventory or supermarket price ID determines linking; never infer it from cost. */
  inventoryItemId?: string | null;
  generalPriceId?: string | null;
  rawName?: string;
  linked?: boolean;
};

/** Live cost breakdown computed from stock; never stored. */
export type RecipeCosting = {
  currency?: string;
  complete?: boolean;
  measurementState?: MeasurementState;
  costableCount?: number;
  knownSubtotal?: number;
  reasons?: string[];
  ingredientsCost: number;
  laborCost: number;
  batchCost: number | null;
  unitCost: number | null;
  yieldQuantity: number | null;
  retailPrice: number | null;
  /** Backend field is `appliedMarginPercent`. */
  appliedProfitMargin: number;
  /** False when any ingredient is short for a single batch. */
  inStock: boolean;
  ingredients: RecipeIngredient[];
  /** Trusted incomplete-cost signal from costRecipe — never infer from a $0 cost. */
  linkedCount?: number;
  totalCount?: number;
};

export type Recipe = {
  id: string;
  shopId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  prepTimeMinutes: number;
  yieldQuantity: string | null;
  yieldUnit: string;
  targetMarginPct: string | null;
  allergens: string[] | null;
  instructions: string | null;
  isActive: boolean;
  status?: RecipeStatus;
  createdAt: string;
  updatedAt: string;
  costing: RecipeCosting;
};

/**
 * The order lifecycle as the shop sees it: every order starts as
 * `processing` and moves to `delivered` only after explicit human
 * verification via POST /orders/:id/verify. `cancelled` is what
 * DELETE /orders/:id writes instead of removing the row — invoicing
 * needs the issued number to stay assigned as a visible void — and
 * it is terminal. Matches the backend ORDER_STATUSES enum in
 * Neuton-Back.
 */
export type OrderStatus = 'processing' | 'delivered' | 'cancelled';

/** One sellable recipe as returned by GET /recipes/orderable. */
export type OrderableRecipe = {
  currency?: string;
  costingStatus?: MeasurementState;
  id: string;
  name: string;
  imageUrl: string | null;
  yieldQuantity: string | null;
  yieldUnit: string;
  unitCost: number | null;
  retailPrice: number | null;
};

export type Order = {
  currency?: string | null;
  costingStatus?: string;
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
  totalCost: string | null;
  totalAmount: string;
  documentUrl: string | null;
  status: OrderStatus;
  netProfit: number | null;
  createdAt: string;
};

export type OrderItem = {
  id: string;
  orderId: string;
  recipeId: string;
  quantity: string;
  unitCost: string | null;
  unitPrice: string;
};

/** Line shape returned by GET /orders/:id, which joins in the recipe name. */
export type OrderDetailItem = {
  id: string;
  recipeId: string;
  name: string;
  quantity: string;
  unitCost: string | null;
  unitPrice: string;
};

export type OrderDetail = Order & { items: OrderDetailItem[] };

/** Live price line from POST /orders/quote. */
export type OrderQuoteItem = {
  costingStatus?: MeasurementState;
  reasons?: string[];
  recipeId: string;
  name: string;
  quantity: number;
  unitCost: number | null;
  unitPrice: number | null;
  appliedProfitMargin: number;
  retailPrice: number | null;
};

export type OrderQuote = {
  currency?: string;
  items: OrderQuoteItem[];
  deliveryDistanceKm: number;
  baseFee: number;
  ratePerKm: number;
  totalCost: number | null;
  totalAmount: number | null;
  deliveryFee: number;
  netProfit: number | null;
  profitMarginPercent: number | null;
};

export type Shop = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  storeAddress: string | null;
  targetProfitMargin: string;
  hourlyLaborCost: string;
  deliveryBaseFee: string;
  deliveryRatePerKm: string;
  createdAt: string;
  updatedAt: string;
};

export type ShopMembership = {
  shopId: string;
  role: 'owner' | 'admin' | 'member';
  shops: Shop;
};

/** Matches the backend's Period enum: '12m', not '1y'. */
export type DashboardPeriod = '7d' | '30d' | '90d' | '12m';

export type DashboardSummary = {
  period: DashboardPeriod;
  range: { from: string; to: string };
  summary: {
    revenue: number;
    expenses: number | null;
    knownExpenses?: number;
    incompleteExpenseCount?: number;
    deliveryFees: number;
    productionCost: number | null;
    knownProductionCost?: number;
    incompleteOrderCount?: number;
    netProfit: number | null;
    orderCount: number;
    profitMarginPercent: number | null;
  };
  trend: {
    revenuePercent: number;
    profitPercent: number | null;
    expensesPercent: number | null;
  };
  graph: { date: string; revenue: number; expenses: number; netProfit: number | null }[];
  topItem: {
    recipeId: string;
    name: string;
    imageUrl: string | null;
    unitsSold: number;
    revenue: number;
    netProfit: number | null;
  } | null;
  orderProfitability: {
    average: number;
    median: number;
    sampleSize: number;
  };
  lowStock: {
    id: string;
    name: string;
    unit: string;
    currentQuantity: number;
    reorderLevel: number;
  }[];
};

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

/** Mirrors the backend's ALLOWED_CONTENT_TYPES. */
export const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
] as const;
