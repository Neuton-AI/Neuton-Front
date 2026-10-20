import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadSources, validateUploadFiles, type UploadSession } from './uploadSources';

const context = { token: 'jwt', shopId: 'shop-1' };
const first = new File(['page one'], 'first.jpg', { type: 'image/jpeg' });
const second = new File(['page two'], 'second.pdf', { type: 'application/pdf' });
const sources = [first, second].map((file, index) => ({
  sourceId: `source-${index}`,
  storagePath: `group/${index}`,
  uploadUrl: `https://storage.test/${index}`,
  contentType: file.type,
  originalFilename: file.name,
  byteSize: file.size,
}));
const presign = { uploadId: 'group-1', receiptId: 'receipt-1', recipeId: null, sources, method: 'PUT', expiresIn: 900 };
const complete = { uploadId: 'group-1', receiptId: 'receipt-1', recipeId: null, queued: true, jobId: 'job-1' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
function stub(...responses: Response[]) {
  const fetchMock = vi.fn();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
function body(fetchMock: ReturnType<typeof vi.fn>, index: number) {
  return JSON.parse(fetchMock.mock.calls[index][1].body);
}
afterEach(() => vi.unstubAllGlobals());

describe('uploadSources', () => {
  it('preserves visible source order and queues one document only after every PUT', async () => {
    const fetchMock = stub(json(presign), new Response(null), new Response(null), json(complete));
    const progress: UploadSession[] = [];
    await expect(uploadSources([second, first], 'receipt', {
      context,
      onProgress: (session) => progress.push(session),
    })).resolves.toEqual(complete);
    expect(body(fetchMock, 0)).toEqual({
      clientRequestId: expect.any(String),
      kind: 'receipt',
      sources: [second, first].map((file) => ({ originalFilename: file.name, contentType: file.type, byteSize: file.size })),
    });
    expect(fetchMock.mock.calls[1][1].body).toBe(second);
    expect(fetchMock.mock.calls[2][1].body).toBe(first);
    expect(body(fetchMock, 3)).toEqual({ uploadId: 'group-1' });
    expect(progress[0].sources.map((source) => source.status)).toEqual(['pending', 'pending']);
    expect(progress.at(-1)?.sources.map((source) => source.status)).toEqual(['uploaded', 'uploaded']);
    expect(progress.at(-1)?.phase).toBe('done');
  });

  it('retries only a failed source with the same group and source identities', async () => {
    const fetchMock = stub(json(presign), new Response(null), new Response(null, { status: 503 }));
    let session: UploadSession | undefined;
    await expect(uploadSources([first, second], 'receipt', {
      context,
      onProgress: (value) => { session = value; },
    })).rejects.toThrow('1 source failed');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(session?.sources.map((source) => source.status)).toEqual(['uploaded', 'failed']);
    expect(session?.sources[1].error).toContain('503');

    fetchMock.mockResolvedValueOnce(json({ ...presign, sources: [sources[1]] }))
      .mockResolvedValueOnce(new Response(null)).mockResolvedValueOnce(json(complete));
    await uploadSources([first, second], 'receipt', { context, session });
    expect(body(fetchMock, 3)).toEqual({ uploadId: 'group-1', sourceIds: ['source-1'] });
    expect(fetchMock.mock.calls[4][1].body).toBe(second);
    expect(body(fetchMock, 5)).toEqual({ uploadId: 'group-1' });
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('reuses the original request identity when the first presign response is lost', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('Network disconnected'));
    vi.stubGlobal('fetch', fetchMock);
    let session: UploadSession | undefined;
    await expect(uploadSources([first], 'receipt', {
      context, onProgress: (value) => { session = value; },
    })).rejects.toThrow('Cannot reach the server');
    const original = body(fetchMock, 0);
    expect(original.clientRequestId).toBe(session?.clientRequestId);
    expect(session?.uploadId).toBeNull();
    fetchMock.mockResolvedValueOnce(json({ ...presign, sources: [sources[0]] }))
      .mockResolvedValueOnce(new Response(null)).mockResolvedValueOnce(json(complete));
    await uploadSources([first], 'receipt', { context, session });
    expect(body(fetchMock, 1)).toEqual(original);
  });

  it('continues later sources after one fails and preserves those successes for retry', async () => {
    const fetchMock = stub(json(presign), new Response(null, { status: 403 }), new Response(null));
    let session: UploadSession | undefined;
    await expect(uploadSources([first, second], 'receipt', {
      context, onProgress: (value) => { session = value; },
    })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(session?.sources.map((source) => source.status)).toEqual(['failed', 'uploaded']);
  });

  it('retries completion without retransferring any source, and returns completed sessions directly', async () => {
    const fetchMock = stub(json({ ...presign, sources: [sources[0]] }), new Response(null), json({ error: 'Unavailable' }, 503));
    let session: UploadSession | undefined;
    const onProgress = (value: UploadSession) => { session = value; };
    await expect(uploadSources([first], 'receipt', { context, onProgress })).rejects.toThrow('Unavailable');
    fetchMock.mockResolvedValueOnce(json(complete));
    await uploadSources([first], 'receipt', { context, session, onProgress });
    expect(body(fetchMock, 3)).toEqual({ uploadId: 'group-1' });
    await expect(uploadSources([first], 'receipt', { context, session })).resolves.toEqual(complete);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('retains uploaded sources for completion retry when the queue is unavailable', async () => {
    const fetchMock = stub(json({ ...presign, sources: [sources[0]] }), new Response(null),
      json({ ...complete, queued: false, jobId: null, reason: 'queue unavailable' }));
    let session: UploadSession | undefined;
    await expect(uploadSources([first], 'receipt', {
      context, onProgress: (value) => { session = value; },
    })).rejects.toThrow('processing is unavailable');
    expect(session?.phase).toBe('failed');
    expect(session?.sources[0].status).toBe('uploaded');
    expect(session?.result).toBeUndefined();
    fetchMock.mockResolvedValueOnce(json(complete));
    await uploadSources([first], 'receipt', { context, session });
    expect(body(fetchMock, 3)).toEqual({ uploadId: 'group-1' });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('rejects invalid collections before network access', async () => {
    const fetchMock = stub();
    await expect(uploadSources([first, first, first, first, first], 'receipt', { context })).rejects.toThrow('up to 4');
    expect(validateUploadFiles([new File(['x'], 'bad.txt', { type: 'text/plain' })])).toContain('JPG');
    const tooLarge = new File(['x'], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(tooLarge, 'size', { value: 10 * 1024 * 1024 + 1 });
    expect(validateUploadFiles([tooLarge])).toContain('10 MB');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects reordered or changed files when resuming a document', async () => {
    const fetchMock = stub(json(presign), new Response(null), new Response(null, { status: 503 }));
    let session: UploadSession | undefined;
    await expect(uploadSources([first, second], 'receipt', {
      context, onProgress: (value) => { session = value; },
    })).rejects.toThrow();
    await expect(uploadSources([second, first], 'receipt', { context, session })).rejects.toThrow('same document sources');
    await expect(uploadSources([first, second], 'recipe', { context, session })).rejects.toThrow('same document sources');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
