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
const applyConstraints = vi.fn();
const track = {
  stop,
  readyState: 'live',
  getCapabilities: () => ({ focusMode: ['continuous'] }),
  applyConstraints,
};
const stream = {
  getTracks: () => [track],
  getVideoTracks: () => [track],
} as unknown as MediaStream;
const getUserMedia = vi.fn<() => Promise<MediaStream>>();
beforeEach(() => {
  resetAuth();
  boundary.upload.mockReset().mockResolvedValue({});
  boundary.navigate.mockReset();
  stop.mockReset();
  applyConstraints.mockReset().mockResolvedValue(undefined);
  getUserMedia.mockReset().mockResolvedValue(stream);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia,
      getSupportedConstraints: () => ({ pointsOfInterest: true }),
    },
  });
});

describe('useCapturePage', () => {
  it('rejects oversized camera captures with recovery while keeping the camera available', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) =>
      callback(new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'image/jpeg' })),
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
    expect(result.current.error).toMatch(/larger than 10 MB.*smaller photo/);
    expect(result.current.file).toBeNull();
    expect(result.current.capturing).toBe(false);
    expect(stop).not.toHaveBeenCalled();
  });

  it('discards a pending capture after navigating away', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    let finish!: BlobCallback;
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      finish = callback;
    });
    const create = vi.spyOn(URL, 'createObjectURL');
    const { result, unmount } = renderHookWithProviders(() => useCapturePage());
    const video = document.createElement('video');
    Object.defineProperties(video, {
      readyState: { value: 2 },
      videoWidth: { value: 640 },
      videoHeight: { value: 480 },
    });
    Object.defineProperty(result.current.videoRef, 'current', { value: video });
    await act(async () => result.current.handleShutter());
    unmount();
    await act(async () => finish(new Blob(['late'], { type: 'image/jpeg' })));
    expect(create).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalledOnce();
  });
  it('requests high resolution and continuous autofocus by default, without surfacing failures', async () => {
    applyConstraints.mockRejectedValue(new Error('Not supported'));
    const { result } = renderHookWithProviders(() => useCapturePage());
    await waitFor(() =>
      expect(applyConstraints).toHaveBeenCalledWith({
        advanced: [{ focusMode: 'continuous' }],
      }),
    );
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: expect.objectContaining({
        width: { ideal: 3840 },
        height: { ideal: 2160 },
      }),
    });
    expect(result.current.error).toBeNull();
  });

  it('silently rejects tap focus and keeps capturing available', async () => {
    const { result } = renderHookWithProviders(() => useCapturePage());
    await waitFor(() => expect(applyConstraints).toHaveBeenCalledOnce());
    const video = document.createElement('video');
    Object.defineProperties(video, {
      videoWidth: { value: 1920 },
      videoHeight: { value: 1080 },
    });
    vi.spyOn(video, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 300,
      height: 300,
    } as DOMRect);
    Object.defineProperty(result.current.videoRef, 'current', { value: video });
    applyConstraints.mockRejectedValue(new Error('Camera refused'));
    await act(async () => result.current.handleFocus(150, 150));
    expect(result.current.error).toBeNull();
    expect(result.current.focusPoint).toBeNull();
    expect(result.current.capturing).toBe(false);
    expect(applyConstraints).toHaveBeenLastCalledWith({
      advanced: [{ focusMode: 'continuous', pointsOfInterest: [{ x: 0.5, y: 0.5 }] }],
    });
  });

  it('shows only a temporary request indicator after supported focus and can retake', async () => {
    const { result } = renderHookWithProviders(() => useCapturePage());
    await waitFor(() => expect(applyConstraints).toHaveBeenCalledOnce());
    const video = document.createElement('video');
    Object.defineProperties(video, {
      videoWidth: { value: 1920 },
      videoHeight: { value: 1080 },
    });
    vi.spyOn(video, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 20,
      width: 300,
      height: 300,
    } as DOMRect);
    Object.defineProperty(result.current.videoRef, 'current', { value: video });
    await act(async () => result.current.handleFocus(160, 170));
    expect(result.current.focusPoint).toEqual({ x: 150, y: 150 });
    act(() => result.current.onPick(makeFile('scan.jpg', 'image/jpeg')));
    expect(result.current.focusPoint).toBeNull();
    act(() => result.current.handleRetake());
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
    expect(result.current.file).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('discards a capture resolving after a picker selection and guards double shutters', async () => {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    let finish!: BlobCallback;
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      finish = callback;
    });
    const { result } = renderHookWithProviders(() => useCapturePage());
    const video = document.createElement('video');
    Object.defineProperties(video, {
      readyState: { value: 2 },
      videoWidth: { value: 640 },
      videoHeight: { value: 480 },
    });
    Object.defineProperty(result.current.videoRef, 'current', { value: video });
    await act(async () => {
      result.current.handleShutter();
      result.current.handleShutter();
    });
    expect(drawImage).toHaveBeenCalledOnce();
    const selected = makeFile('chosen.png', 'image/png');
    act(() => result.current.onPick(selected));
    await act(async () => finish(new Blob(['late'], { type: 'image/jpeg' })));
    expect(result.current.file).toBe(selected);
    expect(result.current.capturing).toBe(false);
  });

  it.each(['receipt', 'recipe', 'product', 'order'])(
    'preserves the %s upload kind',
    async (kind) => {
      const { result } = renderHookWithProviders(() => useCapturePage(), {
        route: `/capture?kind=${kind}`,
      });
      const picked = makeFile('chosen.png', 'image/png');
      act(() => result.current.onPick(picked));
      await act(async () => result.current.handleShutter());
      expect(boundary.upload).toHaveBeenCalledWith(
        picked,
        kind,
        expect.any(Object),
        expect.any(Function),
      );
    },
  );
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
