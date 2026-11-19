import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { orderReviewDetails } from './reviewConflict';
const recipeId = '11111111-1111-1111-1111-111111111111';
const missingId = '22222222-2222-2222-2222-222222222222';
const current = { recipeId, name: 'Focaccia', unitPrice: '3.00', costComplete: true };
const changed = { recipeId, name: 'Focaccia', expectedUnitPrice: '2.60', currentUnitPrice: '3.00' };
const base = { reasons: ['PRICE_CHANGED'], unavailable: [], priceChanges: [changed], currentItems: [current] };
const error = (details: unknown, code = 'ORDER_REVIEW_REQUIRED') => new ApiError('Review the updated order.', 409, code, undefined, undefined, details);

describe('typed order review details', () => {
  it.each([
    ['price only', base],
    ['availability only', { ...base, reasons: ['AVAILABILITY_CHANGED'], priceChanges: [], unavailable: [{ recipeId: missingId, reason: 'INACTIVE' }] }],
    ['combined', { ...base, reasons: ['PRICE_CHANGED', 'AVAILABILITY_CHANGED'], unavailable: [{ recipeId: missingId, reason: 'NOT_FOUND' }] }],
    ['restored selection', { ...base, reasons: ['AVAILABILITY_CHANGED'], priceChanges: [] }],
  ])('preserves validated %s corrections', (_name, details) => {
    expect(orderReviewDetails(error(details))).toEqual(details);
  });
  it.each([
    { ...base, reasons: ['UNKNOWN'] },
    { ...base, reasons: [] },
    { ...base, currentItems: [] },
    { ...base, priceChanges: [] },
    { ...base, currentItems: [{ ...current, costComplete: 'false' }] },
    { ...base, currentItems: [{ ...current, unitPrice: '-1.00' }] },
    { ...base, currentItems: [{ ...current, name: 'x'.repeat(161) }] },
    { ...base, priceChanges: [{ ...changed, currentUnitPrice: '4.00' }] },
    { ...base, unavailable: [{ recipeId: missingId, reason: 'DELETED' }] },
    { ...base, unavailable: [{ recipeId: 'invalid', reason: 'NOT_FOUND' }] },
    { ...base, currentItems: Array.from({ length: 101 }, () => current) },
  ])('rejects malformed or oversized corrections without replacing the API error', details => {
    const failure = error(details);
    expect(orderReviewDetails(failure)).toBeUndefined();
    expect(failure.message).toBe('Review the updated order.');
  });
  it('leaves no-available and ordinary errors on their existing code/message path', () => {
    expect(orderReviewDetails(error(undefined, 'NO_AVAILABLE_ITEMS'))).toBeUndefined();
    expect(orderReviewDetails(error(base, 'CONFLICT'))).toBeUndefined();
    expect(orderReviewDetails(new Error('Offline'))).toBeUndefined();
  });
});
