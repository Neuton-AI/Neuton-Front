import { authState, resetAuth } from '@/test/auth';
import { makeFile, renderHookWithProviders } from '@/test/render';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCapturePage } from './CapturePage.module';

const boundary = vi.hoisted(() => ({ upload: vi.fn(), navigate: vi.fn() }));
vi.mock('@/features/auth/supabase', async () => (await import('@/test/auth')).authMock);
vi.mock('@/features/uploads/upload', () => ({ uploadMedia: boundary.upload }));
vi.mock('react-router-dom', async (original) => ({
  ...(await original<typeof import('react-router-dom')>()),
  useNavigate: () => boundary.navigate,
}));

const stop = vi.fn();
const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
const getUserMedia = vi.fn<() => Promise<MediaStream>>();
beforeEach(() => {
  resetAuth();
  boundary.upload.mockReset().mockResolvedValue({});
  boundary.navigate.mockReset();
  stop.mockReset();
  getUserMedia.mockReset().mockResolvedValue(stream);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
});

describe('useCapturePage', () => {
  it('routes each source to its own picker synchronously and resets it for repeat selections', () => {
    const { result } = renderHookWithProviders(() => useCapturePage());
    const sources = [
      { source: 'gallery', ref: result.current.galleryInputRef },
      { source: 'file', ref: result.current.fileInputRef },
      { source: 'camera', ref: result.current.cameraInputRef },
    ] as const;
    for (const { source, ref } of sources) {
      const input = document.createElement('input');
      input.value = 'previous-selection';
      vi.spyOn(input, 'click').mockImplementation(() => {});
      Object.defineProperty(ref, 'current', { value: input });
      act(() => result.current.handleBrowse());
      act(() => result.current.chooseSource(source));
      expect(input.value).toBe('');
      expect(input.click).toHaveBeenCalledOnce();
      expect(result.current.sourceChooserOpen).toBe(true);
    }
  });
  it('pauses the in-app camera while choosing a source and restarts it after cancellation', async () => {
    const { result } = renderHookWithProviders(() => useCapturePage());
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce());
    act(() => result.current.handleBrowse());
    expect(stop).toHaveBeenCalledOnce();
    expect(getUserMedia).toHaveBeenCalledOnce();
    act(() => result.current.onPick(undefined));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
    expect(result.current.sourceChooserOpen).toBe(false);
    expect(result.current.error).toBeNull();
  });
  it('preserves the current document and error when the picker is cancelled', () => {
    const { result } = renderHookWithProviders(() => useCapturePage());
    const file = makeFile('existing.jpg', 'image/jpeg');
    act(() => result.current.onPick(file));
    act(() => result.current.onPick(makeFile('unsupported.txt', 'text/plain')));
    const error = result.current.error;
    act(() => result.current.handleBrowse());
    act(() => result.current.onPick(undefined));
    expect(result.current.file).toBe(file);
    expect(result.current.error).toBe(error);
    expect(result.current.sourceChooserOpen).toBe(false);
  });
  it('handles native cancellation from all three inputs without losing the selected document', () => {
    const { result } = renderHookWithProviders(() => useCapturePage());
    const inputs = [
      result.current.galleryInputRef,
      result.current.fileInputRef,
      result.current.cameraInputRef,
    ].map((ref) => {
      const input = document.createElement('input');
      input.type = 'file';
      Object.defineProperty(ref, 'current', { value: input });
      return input;
    });
    const file = makeFile('existing.jpg', 'image/jpeg');
    act(() => result.current.onPick(file));
    for (const input of inputs) {
      act(() => result.current.handleBrowse());
      expect(result.current.sourceChooserOpen).toBe(true);
      act(() => input.dispatchEvent(new Event('cancel')));
      expect(result.current.sourceChooserOpen).toBe(false);
      expect(result.current.file).toBe(file);
      expect(result.current.error).toBeNull();
    }
  });
  it('keeps alternate sources usable after a picker fails to open', () => {
    const { result } = renderHookWithProviders(() => useCapturePage());
    const input = document.createElement('input');
    const click = vi.spyOn(input, 'click').mockImplementation(() => {});
    Object.defineProperty(result.current.galleryInputRef, 'current', {
      value: input,
    });
    act(() => result.current.handleBrowse());
    act(() => result.current.chooseSource('camera'));
    expect(result.current.error).toMatch(/Try Gallery or File explorer/);
    expect(result.current.sourceChooserOpen).toBe(true);
    act(() => result.current.chooseSource('gallery'));
    expect(click).toHaveBeenCalledOnce();
  });
  it('ignores a camera denial from before the source chooser opened', async () => {
    let reject!: (reason: Error) => void;
    getUserMedia.mockReturnValue(
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
    );
    const { result } = renderHookWithProviders(() => useCapturePage());
    act(() => result.current.handleBrowse());
    await act(async () => reject(new Error('Camera interrupted')));
    expect(result.current.error).toBeNull();
  });
  it.each([
    ['scan.jpg', 'image/jpeg'],
    ['scan.png', 'image/png'],
    ['scan.webp', 'image/webp'],
    ['scan.heic', 'image/heic'],
    ['scan.pdf', 'application/pdf'],
  ])('passes a selected %s through validation and upload', async (name, type) => {
    const { result } = renderHookWithProviders(() => useCapturePage());
    const file = makeFile(name, type);
    act(() => result.current.handleBrowse());
    act(() => result.current.onPick(file));
    expect(result.current.sourceChooserOpen).toBe(false);
    expect(result.current.file).toBe(file);
    act(() => result.current.handleShutter());
    await waitFor(() =>
      expect(boundary.upload).toHaveBeenCalledWith(
        file,
        'receipt',
        { token: 'token-1', shopId: 'shop-1' },
        expect.any(Function),
      ),
    );
  });
  it('captures a ready camera frame as an image preview', async () => {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) =>
      callback(new Blob(['frame'], { type: 'image/jpeg' })),
    );
    const { result } = renderHookWithProviders(() => useCapturePage());
    const video = document.createElement('video');
    Object.defineProperties(video, {
      readyState: { value: 2 },
      videoWidth: { value: 640 },
      videoHeight: { value: 480 },
    });
    Object.defineProperty(result.current.videoRef, 'current', { value: video });
    await act(async () => result.current.handleShutter());
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 640, 480);
    expect(result.current.file?.name).toBe('capture.jpg');
    expect(result.current.file?.type).toBe('image/jpeg');
    expect(result.current.previewUrl).toBeTruthy();
  });
  it('defaults invalid URL kinds and rejects unsupported or oversized files', async () => {
    const { result } = renderHookWithProviders(() => useCapturePage(), {
      route: '/capture?kind=unknown',
    });
    expect(result.current.kind).toBe('receipt');
    act(() => result.current.onPick(makeFile('script.js', 'text/javascript')));
    expect(result.current.error).toMatch(/Use a JPG/);
    const oversized = makeFile('photo.jpg', 'image/jpeg');
    Object.defineProperty(oversized, 'size', { value: 10 * 1024 * 1024 + 1 });
    act(() => result.current.onPick(oversized));
    expect(result.current.error).toMatch(/larger than 10 MB/);
    expect(result.current.file).toBeNull();
    await act(async () => result.current.handleShutter());
    expect(boundary.upload).not.toHaveBeenCalled();
  });
  it('revokes each image preview and stops the camera when a file is picked', async () => {
    const create = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:first')
      .mockReturnValueOnce('blob:second');
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const { result, unmount } = renderHookWithProviders(() => useCapturePage());
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    await act(async () => result.current.onPick(makeFile('one.jpg', 'image/jpeg')));
    expect(result.current.previewUrl).toBe('blob:first');
    expect(stop).toHaveBeenCalledTimes(1);
    act(() => result.current.onPick(makeFile('two.jpg', 'image/jpeg')));
    expect(revoke).toHaveBeenCalledWith('blob:first');
    unmount();
    expect(revoke).toHaveBeenCalledWith('blob:second');
    expect(create).toHaveBeenCalledTimes(2);
  });
  it('stops a camera that resolves after unmount', async () => {
    let resolve!: (stream: MediaStream) => void;
    getUserMedia.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { unmount } = renderHookWithProviders(() => useCapturePage());
    unmount();
    await act(async () => resolve(stream));
    expect(stop).toHaveBeenCalledTimes(1);
  });
  it('allows a file upload after camera denial and returns to the receipt list', async () => {
    getUserMedia.mockRejectedValue(new Error('denied'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHookWithProviders(() => useCapturePage());
    await waitFor(() => expect(result.current.error).toMatch(/Camera access denied/));
    const pdf = makeFile('scan.pdf', 'application/pdf');
    act(() => result.current.onPick(pdf));
    act(() => result.current.handleShutter());
    await waitFor(() => expect(boundary.navigate).toHaveBeenCalledWith('/catalog?tab=receipts'));
    expect(boundary.upload).toHaveBeenCalledWith(
      pdf,
      'receipt',
      { token: 'token-1', shopId: 'shop-1' },
      expect.any(Function),
    );
    expect(result.current.previewUrl).toBeNull();
  });
  it('shows upload failures, resets progress, and releases the busy state', async () => {
    boundary.upload.mockImplementation(async (_file, _kind, _context, progress) => {
      progress({ phase: 'uploading', percent: 40 });
      throw new Error('Upload rejected');
    });
    const { result } = renderHookWithProviders(() => useCapturePage(), {
      route: '/capture?kind=recipe',
    });
    act(() => result.current.onPick(makeFile('scan.png', 'image/png')));
    act(() => result.current.handleShutter());
    await waitFor(() => expect(result.current.error).toBe('Upload rejected'));
    expect(result.current.busy).toBe(false);
    expect(result.current.progress).toBeNull();
    expect(boundary.navigate).not.toHaveBeenCalled();
  });
  it('rejects uploads without credentials or an active shop', async () => {
    authState.token = null;
    const { result } = renderHookWithProviders(() => useCapturePage());
    act(() => result.current.onPick(makeFile('scan.pdf', 'application/pdf')));
    await act(async () => result.current.handleShutter());
    expect(boundary.upload).not.toHaveBeenCalled();
  });
});
