import { ApiError } from '@/lib/api';
import type { OrderReviewDetails } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isRecipeId(value: unknown): value is string {
  return typeof value === 'string' && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);
}
function isUnitPrice(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9]\d{0,7})\.\d{2}$/.test(value);
}
function isRecipeName(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 160;
}
function isReviewReason(value: unknown): value is OrderReviewDetails['reasons'][number] {
  return value === 'PRICE_CHANGED' || value === 'AVAILABILITY_CHANGED';
}
function isUnavailableItem(value: unknown): value is OrderReviewDetails['unavailable'][number] {
  return isRecord(value) && isRecipeId(value.recipeId) &&
    (value.reason === 'NOT_FOUND' || value.reason === 'INACTIVE' || value.reason === 'UNVERIFIED');
}
function isPriceChange(value: unknown): value is OrderReviewDetails['priceChanges'][number] {
  return isRecord(value) && isRecipeId(value.recipeId) && isRecipeName(value.name) && isUnitPrice(value.expectedUnitPrice) && isUnitPrice(value.currentUnitPrice);
}
function isCurrentItem(value: unknown): value is OrderReviewDetails['currentItems'][number] {
  return isRecord(value) && isRecipeId(value.recipeId) && isRecipeName(value.name) && isUnitPrice(value.unitPrice) && typeof value.costComplete === 'boolean';
}
function boundedArray<T>(value: unknown, check: (entry: unknown) => entry is T): value is T[] {
  return Array.isArray(value) && value.length <= 100 && value.every(check);
}

/** Only validated corrections may become authoritative draft state. */
export function orderReviewDetails(error: unknown): OrderReviewDetails | undefined {
  if (!(error instanceof ApiError) || error.status !== 409 || error.code !== 'ORDER_REVIEW_REQUIRED') {
    return undefined;
  }
  const details = error.details;
  if (!isRecord(details) || !boundedArray(details.reasons, isReviewReason) || details.reasons.length < 1 || details.reasons.length > 2 ||
    !boundedArray(details.unavailable, isUnavailableItem) || !boundedArray(details.priceChanges, isPriceChange) ||
    !boundedArray(details.currentItems, isCurrentItem) || details.currentItems.length === 0) {
    return undefined;
  }
  if (details.reasons.includes('PRICE_CHANGED') !== (details.priceChanges.length > 0)) {
    return undefined;
  }
  const currentItems = details.currentItems;
  const priceChanges = details.priceChanges;
  const changesMatchCurrentItems = priceChanges.every(change =>
    currentItems.some(item => item.recipeId === change.recipeId && item.unitPrice === change.currentUnitPrice));
  if (!changesMatchCurrentItems) return undefined;
  return { reasons: details.reasons, unavailable: details.unavailable, priceChanges: details.priceChanges, currentItems: details.currentItems };
}
