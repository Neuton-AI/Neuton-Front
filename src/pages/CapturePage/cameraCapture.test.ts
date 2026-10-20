import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { capturePhoto } from './cameraCapture';

const drawImage = vi.fn();
const takePhoto = vi.fn();
const getPhotoCapabilities = vi.fn();
const track = { readyState: 'live' };

function cameraVideo(width = 1920, height = 1080, readyState = 2) {
  const video = document.createElement('video');
  Object.defineProperties(video, {
    videoWidth: { value: width },
    videoHeight: { value: height },
    readyState: { value: readyState },
    srcObject: { value: { getVideoTracks: () => [track] } },
  });
  return video;
}

beforeEach(() => {
  drawImage.mockReset();
  takePhoto.mockReset().mockResolvedValue(new Blob(['photo'], { type: 'image/jpeg' }));
  getPhotoCapabilities.mockReset().mockResolvedValue({
    imageWidth: { max: 4032 },
    imageHeight: { max: 3024 },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) =>
    callback(new Blob(['frame'], { type: 'image/jpeg' })),
  );
  vi.stubGlobal(
    'ImageCapture',
    class {
      getPhotoCapabilities = getPhotoCapabilities;
      takePhoto = takePhoto;
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('capturePhoto', () => {
  it('prefers native still capture and requests the largest available photo dimensions', async () => {
    const file = await capturePhoto(cameraVideo());
    expect(takePhoto).toHaveBeenCalledWith({
      imageWidth: 4032,
      imageHeight: 3024,
    });
    expect(file?.name).toBe('capture.jpg');
    expect(file?.size).toBe(5);
    expect(drawImage).not.toHaveBeenCalled();
  });

  it.each(['image/png', 'image/webp', 'image/heic'])(
    'preserves native %s MIME and extension',
    async (type) => {
      takePhoto.mockResolvedValue(new Blob(['photo'], { type }));
      const file = await capturePhoto(cameraVideo());
      expect(file?.type).toBe(type);
      expect(file?.name).toBe(`capture.${type.slice(6)}`);
    },
  );

  it.each([undefined, {}, { imageWidth: { max: NaN }, imageHeight: { max: -1 } }])(
    'uses default still settings when dimensions are unavailable or invalid: %j',
    async (capabilities) => {
      getPhotoCapabilities.mockResolvedValue(capabilities);
      await capturePhoto(cameraVideo());
      expect(takePhoto).toHaveBeenCalledWith();
      expect(drawImage).not.toHaveBeenCalled();
    },
  );

  it('still takes a photo if the optional capability query rejects', async () => {
    getPhotoCapabilities.mockRejectedValue(new Error('unsupported'));
    await capturePhoto(cameraVideo());
    expect(takePhoto).toHaveBeenCalledWith();
    expect(drawImage).not.toHaveBeenCalled();
  });

  it('retries default native still capture if reported maximum dimensions are rejected', async () => {
    takePhoto.mockRejectedValueOnce(new Error('Unsupported photo dimensions'));
    const file = await capturePhoto(cameraVideo());
    expect(takePhoto).toHaveBeenNthCalledWith(1, { imageWidth: 4032, imageHeight: 3024 });
    expect(takePhoto).toHaveBeenNthCalledWith(2);
    expect(takePhoto).toHaveBeenCalledTimes(2);
    expect(file?.size).toBe(5);
    expect(file?.type).toBe('image/jpeg');
    expect(drawImage).not.toHaveBeenCalled();
  });

  it('does not retry a failed native capture that already used default settings', async () => {
    getPhotoCapabilities.mockResolvedValue(undefined);
    takePhoto.mockRejectedValue(new Error('Still capture unavailable'));
    const video = cameraVideo();
    const file = await capturePhoto(video);
    expect(takePhoto).toHaveBeenCalledExactlyOnceWith();
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 1920, 1080);
    expect(file?.size).toBe(5);
  });

  it.each(['missing', 'rejected', 'empty', 'unsupported MIME', 'missing takePhoto'])(
    'falls back at native video resolution when still capture is %s',
    async (failure) => {
      if (failure === 'missing') vi.stubGlobal('ImageCapture', undefined);
      if (failure === 'rejected') takePhoto.mockRejectedValue(new Error('unsupported'));
      if (failure === 'empty') takePhoto.mockResolvedValue(new Blob([], { type: 'image/jpeg' }));
      if (failure === 'unsupported MIME')
        takePhoto.mockResolvedValue(new Blob(['photo'], { type: 'image/tiff' }));
      if (failure === 'missing takePhoto') vi.stubGlobal('ImageCapture', class {});
      const video = cameraVideo(1280, 720);
      const file = await capturePhoto(video);
      expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 1280, 720);
      expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/jpeg',
        0.95,
      );
      expect(file?.name).toBe('capture.jpg');
    },
  );

  it.each([
    [0, 720, 2],
    [1280, 0, 2],
    [1280, 720, 1],
    [NaN, 720, 2],
  ])(
    'does not draw invalid or unready video dimensions %s x %s at ready state %s',
    async (width, height, readyState) => {
      vi.stubGlobal('ImageCapture', undefined);
      expect(await capturePhoto(cameraVideo(width, height, readyState))).toBeNull();
      expect(drawImage).not.toHaveBeenCalled();
    },
  );

  it('returns no photo when canvas encoding fails to produce data', async () => {
    vi.stubGlobal('ImageCapture', undefined);
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation((callback) => callback(null));
    expect(await capturePhoto(cameraVideo())).toBeNull();
  });

  it('propagates canvas drawing failures so the caller can handle capture errors', async () => {
    vi.stubGlobal('ImageCapture', undefined);
    drawImage.mockImplementation(() => {
      throw new Error('Cannot draw frame');
    });
    await expect(capturePhoto(cameraVideo())).rejects.toThrow('Cannot draw frame');
  });
});
