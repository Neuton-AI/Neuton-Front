import { ApiError } from '@/lib/api';
import { resetAuth } from '@/test/auth';
import { buildRecipe } from '@/test/factories/recipes.factory';
import { renderWithRouter } from '@/test/render';
import { act, fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The scanner is the only place a merchant can turn an unmatched ingredient
 * into a priced one, and it runs on phones: a camera may be missing, denied, or
 * sit next to a decoder that is absent entirely. These tests pin that every one
 * of those paths still ends in a typed link call with a validated barcode — and
 * that the screen only leaves after the link succeeded.
 */

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: api.apiFetch,
}));

vi.mock('@/features/auth/supabase', async () => (await import('@/test/auth')).authMock);

const { IngredientScanPage } = await import('@/pages/IngredientScanPage/IngredientScanPage');

const BARCODE = '4006381333931';

function buildRecipeWithIngredient() {
  const recipe = buildRecipe();
  recipe.costing.ingredients = [
    { ...recipe.costing.ingredients[0]!, id: 'ing-1', name: 'Honey', inventoryItemId: null },
  ];
  return recipe;
}

type Options = { method?: string; body?: { barcode?: string } };

function mockApi(recipe = buildRecipeWithIngredient()) {
  api.apiFetch.mockImplementation(async (_path: string, options: Options = {}) => {
    if (options.method === 'POST')
      return { costing: { ...recipe.costing, linkedCount: 1, totalCount: 1 } };
    return { recipe };
  });
}

function mockCamera() {
  const getUserMedia = vi.fn(async () => ({ getTracks: () => [] }) as unknown as MediaStream);
  Object.defineProperty(window.navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
  return getUserMedia;
}

function renderScan() {
  return renderWithRouter(
    <Routes>
      <Route path="/catalog/recipes/:id/edit" element={<h1>Edit monitor</h1>} />
      <Route
        path="/catalog/recipes/:id/edit/ingredients/:ingredientId/scan"
        element={<IngredientScanPage />}
      />
    </Routes>,
    {
      initialEntries: [
        '/catalog/recipes/rp-1/edit',
        '/catalog/recipes/rp-1/edit/ingredients/ing-1/scan',
      ],
      initialIndex: 1,
    },
  );
}

function linkCalls() {
  return api.apiFetch.mock.calls.filter(([, options]) => (options as Options)?.method === 'POST');
}

beforeEach(() => {
  api.apiFetch.mockReset();
  resetAuth();
  vi.useFakeTimers();
});

afterEach(() => {
  Object.defineProperty(window.navigator, 'mediaDevices', { configurable: true, value: undefined });
});

describe('IngredientScanPage', () => {
  it('links a manually entered barcode and only then returns to the editor', async () => {
    mockCamera();
    mockApi();
    renderScan();

    fireEvent.change(screen.getByLabelText('Barcode'), { target: { value: BARCODE } });
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(linkCalls()).toHaveLength(1);
    expect(linkCalls()[0]![1].body).toEqual({ barcode: BARCODE });
    expect(screen.getByText('Linked')).toBeInTheDocument();
    expect(screen.queryByText('Edit monitor')).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(screen.getByText('Edit monitor')).toBeInTheDocument();
  });

  it('rejects a barcode that cannot be a real code without calling the API', async () => {
    mockCamera();
    mockApi();
    renderScan();

    fireEvent.change(screen.getByLabelText('Barcode'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('Barcodes are 4 to 64 characters long.')).toBeInTheDocument();
    expect(linkCalls()).toHaveLength(0);
    expect(screen.getByText('Scan barcode')).toBeInTheDocument();
  });

  it('explains a rejected lookup and keeps the code in place for a retry', async () => {
    mockCamera();
    mockApi();
    api.apiFetch.mockImplementation(async (_path: string, options: Options = {}) => {
      if (options.method === 'POST') throw new ApiError('Already linked to inventory', 409);
      return { recipe: buildRecipeWithIngredient() };
    });
    renderScan();

    fireEvent.change(screen.getByLabelText('Barcode'), { target: { value: BARCODE } });
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('Already linked to inventory')).toBeInTheDocument();
    expect(screen.queryByText('Edit monitor')).toBeNull();
    expect(screen.getByLabelText('Barcode')).toHaveValue(BARCODE);
    expect(screen.getByRole('button', { name: 'Link' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(linkCalls()).toHaveLength(2);
  });

  it('starts the environment camera and links what the detector reads', async () => {
    const getUserMedia = mockCamera();
    mockApi();
    class FakeBarcodeDetector {
      detect = async () => [{ rawValue: BARCODE }];
    }
    vi.stubGlobal('BarcodeDetector', FakeBarcodeDetector);
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
      configurable: true,
      get: () => 2,
    });
    renderScan();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' }, audio: false });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(linkCalls()).toHaveLength(1);
    expect(linkCalls()[0]![1].body).toEqual({ barcode: BARCODE });
  });

  it('offers manual entry when the device cannot decode barcodes', async () => {
    mockCamera();
    mockApi();
    renderScan();

    expect(
      screen.getByText(/Camera scanning is not supported on this device/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Barcode')).toBeInTheDocument();
    expect(screen.queryByText(/Camera access denied/)).toBeNull();
  });

  it('falls back to manual entry when the camera itself is unavailable', async () => {
    mockApi();
    renderScan();

    expect(
      screen.getByText('Camera access denied or unavailable. Enter the barcode below instead.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link' })).toBeEnabled();
  });
});
