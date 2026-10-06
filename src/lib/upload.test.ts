import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadMedia, type UploadProgress } from './upload';

/**
 * The upload path is the only place the Front talks to storage directly, so the
 * ordering it enforces is load-bearing: presign, then a PUT that bypasses the
 * API, then complete. Sending `complete` before the bytes land would enqueue an
 * extraction job against a file that does not exist.
 */

const FILE = new File(['receipt-bytes'], 'shop.jpg', { type: 'image/jpeg' });

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function stubFetchSequence(...responses: Response[]) {
  const fn = vi.fn();
  for (const response of responses) fn.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('uploadMedia', () => {
  it('runs presign -> storage PUT -> complete, in that order', async () => {
    const fetchMock = stubFetchSequence(
      json({
        uploadUrl: 'https://r2.test/put?sig=1',
        storagePath: 'shop/2026/receipt.jpg',
        receiptId: 'receipt-1',
        method: 'PUT',
        expiresIn: 900,
      }),
      new Response(null, { status: 200 }),
      json({ receiptId: 'receipt-1', queued: true, jobId: 'job-1' }),
    );

    const result = await uploadMedia(FILE, 'receipt', { token: 'jwt', shopId: 'shop-1' });

    expect(result).toEqual({ receiptId: 'receipt-1', queued: true, jobId: 'job-1' });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // 1. Presign, authenticated, describing the file.
    const [presignUrl, presignInit] = fetchMock.mock.calls[0];
    expect(presignUrl).toContain('/api/v1/uploads/presign');
    expect(presignInit).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer jwt', 'x-shop-id': 'shop-1' },
    });
    expect(JSON.parse(presignInit.body)).toEqual({
      kind: 'receipt',
      contentType: 'image/jpeg',
      originalFilename: 'shop.jpg',
      byteSize: FILE.size,
    });

    // 2. The bytes go straight to storage — never through the API.
    const [putUrl, putInit] = fetchMock.mock.calls[1];
    expect(putUrl).toBe('https://r2.test/put?sig=1');
    expect(putInit.method).toBe('PUT');
    expect(putInit.headers).toEqual({ 'Content-Type': 'image/jpeg' });
    expect(putInit.body).toBe(FILE);

    // 3. Complete carries the storage path back to the API.
    const [completeUrl, completeInit] = fetchMock.mock.calls[2];
    expect(completeUrl).toContain('/api/v1/uploads/complete');
    expect(JSON.parse(completeInit.body)).toEqual({
      storagePath: 'shop/2026/receipt.jpg',
      kind: 'receipt',
      contentType: 'image/jpeg',
      originalFilename: 'shop.jpg',
      receiptId: 'receipt-1',
    });
  });

  it('omits receiptId entirely from complete when presign returns null', async () => {
    const fetchMock = stubFetchSequence(
      json({
        uploadUrl: 'https://r2.test/put?sig=1',
        storagePath: 'shop/recipes/brownies.png',
        receiptId: null,
        method: 'PUT',
        expiresIn: 900,
      }),
      new Response(null, { status: 200 }),
      json({ receiptId: null, queued: true, jobId: 'job-3' }),
    );

    await uploadMedia(FILE, 'recipe', { token: 'jwt', shopId: 'shop-1' });

    const completeBody = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(completeBody).toEqual({
      storagePath: 'shop/recipes/brownies.png',
      kind: 'recipe',
      contentType: 'image/jpeg',
      originalFilename: 'shop.jpg',
    });
    expect('receiptId' in completeBody).toBe(false);
  });

  it('reports every phase in order so the UI can narrate the upload', async () => {
    stubFetchSequence(
      json({ uploadUrl: 'https://r2.test/put', storagePath: 'p', receiptId: null, method: 'PUT', expiresIn: 900 }),
      new Response(null, { status: 200 }),
      json({ receiptId: null, queued: false, jobId: null, reason: 'duplicate' }),
    );

    const seen: UploadProgress[] = [];
    await uploadMedia(FILE, 'receipt', { token: 'jwt', shopId: 'shop-1' }, (p) => seen.push(p));

    expect(seen).toEqual([
      { phase: 'presigning', ratio: null },
      { phase: 'uploading', ratio: 0 },
      { phase: 'uploading', ratio: 1 },
      { phase: 'queueing', ratio: null },
      { phase: 'done', ratio: 1 },
    ]);
  });

  it('attaches the order id on both legs when uploading for an order', async () => {
    const fetchMock = stubFetchSequence(
      json({ uploadUrl: 'https://r2.test/put', storagePath: 'orders/p', receiptId: null, method: 'PUT', expiresIn: 900 }),
      new Response(null, { status: 200 }),
      json({ receiptId: null, queued: true, jobId: 'job-2' }),
    );

    await uploadMedia(FILE, 'order', { token: 'jwt', shopId: 'shop-1' }, undefined, {
      orderId: 'order-9',
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).orderId).toBe('order-9');
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).orderId).toBe('order-9');
  });

  it('fails with a readable message and does not call complete when storage rejects', async () => {
    const fetchMock = stubFetchSequence(
      json({ uploadUrl: 'https://r2.test/put', storagePath: 'p', receiptId: null, method: 'PUT', expiresIn: 900 }),
      new Response(null, { status: 403 }),
    );

    await expect(
      uploadMedia(FILE, 'receipt', { token: 'jwt', shopId: 'shop-1' }),
    ).rejects.toThrow('Upload to storage failed (403). Try again.');

    // Queueing an extraction for bytes that never landed would be worse than failing.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('stops at presign when the API rejects the file', async () => {
    const fetchMock = stubFetchSequence(json({ error: { message: 'File too large' } }, 413));

    await expect(
      uploadMedia(FILE, 'receipt', { token: 'jwt', shopId: 'shop-1' }),
    ).rejects.toThrow('File too large');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
