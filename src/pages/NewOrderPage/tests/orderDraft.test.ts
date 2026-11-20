import { describe, expect, it } from 'vitest';
import { buildRecipe } from '@/test/factories/recipes.factory';
import { changeSelection, projectDraft } from '../orderDraft';

const recipe = (price = '20.00') => buildRecipe({ status: 'verified', orderPricing: {
  unitPrice: price, unitCost: '5.0000', costComplete: true,
} });

describe('local order draft', () => {
  it('keeps the original baseline across changes, renames and return to baseline', () => {
    const selection = changeSelection([], recipe(), 2);
    const changed = { ...recipe('30.00'), name: 'Renamed' };
    expect(projectDraft(selection, [recipe('25.00')]).priceDiffByRecipeId['rp-1']).toEqual({ name: 'Tomato Soup', old: 20, new: 25 });
    const draft = projectDraft(selection, [changed]);
    expect(draft.priceDiffByRecipeId['rp-1']).toEqual({ name: 'Renamed', old: 20, new: 30 });
    expect(draft.subtotal).toBe(60);
    expect(draft.selectedCount).toBe(2);
    expect(projectDraft(selection, [recipe()]).priceDiffByRecipeId).toEqual({});
  });
  it('retains unavailable quantities/name and restores current pricing without billing them while absent', () => {
    const selection = changeSelection([], recipe(), 3);
    const missing = projectDraft(selection, []);
    expect(missing.lines[0]).toMatchObject({ quantity: 3, name: 'Tomato Soup', available: false });
    expect(missing.subtotal).toBe(0);
    expect(missing.selectedCount).toBe(3);
    expect(missing.priceDiffByRecipeId).toEqual({});
    expect(projectDraft(selection, [recipe('30.00')]).subtotal).toBe(90);
    expect(projectDraft(selection, [recipe('30.00')]).priceDiffByRecipeId['rp-1']).toMatchObject({ old: 20, new: 30 });
  });
  it('allows partial, zero and out-of-stock recipes and resets removed/re-added baselines', () => {
    const partial = recipe('0.00');
    partial.orderPricing!.costComplete = false;
    partial.costing.inStock = false;
    const selected = changeSelection([], partial, 1);
    expect(projectDraft(selected, [partial]).lines[0]).toMatchObject({ available: true, unitPrice: '0.00', costComplete: false });
    const removed = changeSelection(selected, partial, -1);
    const readded = changeSelection(removed, recipe('30.00'), 1);
    expect(projectDraft(readded, [recipe('30.00')]).priceDiffByRecipeId).toEqual({});
  });
  it('keeps identities separate for duplicate names and excludes inactive/unverified/malformed pricing', () => {
    const other = { ...recipe('30.00'), id: 'rp-2' };
    const selected = changeSelection(changeSelection([], recipe(), 1), other, 2);
    expect(projectDraft(selected, [recipe('25.00'), other]).subtotal).toBe(85);
    expect(projectDraft(selected, [{ ...recipe(), isActive: false }, other]).subtotal).toBe(60);
    expect(changeSelection([], { ...recipe(), status: 'unverified' }, 1)).toEqual([]);
    expect(changeSelection([], { ...recipe(), orderPricing: null }, 1)).toEqual([]);
  });
  it('uses integer cents to avoid accumulating binary money errors', () => {
    const selected = changeSelection([], recipe('0.10'), 3);
    expect(projectDraft(selected, [recipe('0.10')]).subtotal).toBe(0.3);
  });
  it('retains last displayed pricing during a pending costing snapshot without inferring deletion', () => {
    const selected = changeSelection([], recipe(), 2);
    const pending = { ...recipe(), orderPricing: null };
    const draft = projectDraft(selected, [pending]);
    expect(draft.lines[0]).toMatchObject({ available: true, pricingPending: true, unitPrice: '20.00' });
    expect(draft.unavailableIds).toEqual([]);
    expect(draft.subtotal).toBe(40);
    expect(draft.priceDiffByRecipeId).toEqual({});
  });
});
