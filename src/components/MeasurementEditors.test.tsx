import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import type { ReceiptDetail, RecipeIngredient } from '../lib/api';
import { createTestQueryClient, renderWithRouter } from '../test/render';

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../lib/api', async original => ({ ...(await original<typeof import('../lib/api')>()), apiFetch: api.apiFetch }));
const { ReceiptMeasurementEditor, RecipeMeasurementEditor } = await import('./MeasurementEditors');

const receipt: ReceiptDetail = {
  id: 'receipt', shopId: 'shop', uploadedBy: null, storagePath: 'local', contentType: null, originalFilename: null,
  merchantName: 'Market', receiptDate: null, totalAmount: '20', taxAmount: null, currency: 'ILS', status: 'verified',
  rawExtraction: null, errorMessage: null, processedAt: null, createdAt: '', updatedAt: '', items: [{
    id: 'line', shopId: 'shop', receiptId: 'receipt', inventoryItemId: null, rawName: 'butter', rawSku: '00123457',
    quantity: '2', unit: 'pack', unitPrice: '10', totalPrice: '20', confidence: null, createdAt: '',
    applicationStatus: 'pending', packagesPerPurchase: '2',
  }],
};

beforeEach(() => {
  api.apiFetch.mockReset();
  api.apiFetch.mockImplementation(async path => path.startsWith('/inventory') ? { items: [] } : { ok: true });
});

it('resolves pending stock, preserves code and multipack count, and invalidates dependent prices', async () => {
  const user = userEvent.setup();
  const client = createTestQueryClient();
  for (const key of [['recipe', 'shop'], ['inventory', 'shop'], ['orders', 'shop']]) {
    client.setQueryDefaults(key, { gcTime: Infinity });
    client.setQueryData(key, {});
  }
  const onSaved = vi.fn();
  renderWithRouter(<ReceiptMeasurementEditor item={receipt.items[0]!} receipt={receipt} token="token" shopId="shop" onSaved={onSaved} />, { queryClient: client });
  await user.click(screen.getByText('Resolve purchase measurements'));
  await user.type(screen.getByLabelText('Contents per package'), '250');
  await user.click(screen.getByLabelText('Save confirmed contents for this product in my shop'));
  await user.click(screen.getByRole('button', { name: 'Resolve and add pending stock' }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  expect(api.apiFetch).toHaveBeenCalledWith('/receipts/receipt/resolve-measurements', expect.objectContaining({
    method: 'POST', body: { items: [expect.objectContaining({ rawSku: '00123457', packageQuantity: 250, packageUnit: 'g', packagesPerPurchase: 2, totalPrice: 20, saveProductMeasurement: true })] },
  }));
  expect(client.getQueryState(['inventory', 'shop'])?.isInvalidated).toBe(true);
  expect(client.getQueryState(['recipe', 'shop'])?.isInvalidated).toBe(true);
  expect(client.getQueryState(['orders', 'shop'])?.isInvalidated).toBe(true);
});

it('retains failed corrections and explains retry instead of reporting success', async () => {
  api.apiFetch.mockRejectedValue(new Error('Purchase has already been applied'));
  const user = userEvent.setup(), onSaved = vi.fn();
  renderWithRouter(<ReceiptMeasurementEditor item={receipt.items[0]!} receipt={receipt} token="token" shopId="shop" onSaved={onSaved} />);
  await user.click(screen.getByText('Resolve purchase measurements'));
  await user.type(screen.getByLabelText('Contents per package'), '250');
  await user.click(screen.getByRole('button', { name: 'Resolve and add pending stock' }));
  expect(await screen.findByText('Purchase has already been applied')).toBeInTheDocument();
  expect(screen.getByLabelText('Contents per package')).toHaveValue(250);
  expect(onSaved).not.toHaveBeenCalled();
});

it('saves a catalog package correction at the requested shop product scope', async () => {
  const ingredient: RecipeIngredient = { id: 'line', name: 'cheddar', quantity: 50, unit: 'g', averageUnitCost: null,
    lineCost: null, currentQuantity: null, generalPriceId: 'offer', measurementState: 'unresolved' };
  const user = userEvent.setup();
  renderWithRouter(<RecipeMeasurementEditor ingredient={ingredient} recipeId="recipe" token="token" shopId="shop" onSaved={vi.fn()} />);
  await user.click(screen.getByText('Resolve ingredient'));
  await user.type(screen.getByLabelText('Confirmed total contents of catalog package'), '200');
  await user.click(screen.getByLabelText('Save contents for this product in my shop'));
  await user.click(screen.getByRole('button', { name: 'Save ingredient measurements' }));
  await waitFor(() => expect(api.apiFetch).toHaveBeenCalledWith('/recipes/recipe/ingredients/line/measurement', expect.objectContaining({
    method: 'PATCH', body: expect.objectContaining({ packageContents: { quantity: 200, unit: 'g' }, saveProductMeasurement: true }),
  })));
});
