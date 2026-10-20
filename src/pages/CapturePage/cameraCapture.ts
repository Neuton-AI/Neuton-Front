export const CAMERA_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 3840 },
  height: { ideal: 2160 },
};

interface PhotoSettings {
  imageWidth?: number;
  imageHeight?: number;
}

interface StillCamera {
  getPhotoCapabilities?: () => Promise<unknown>;
  takePhoto?: (settings?: PhotoSettings) => Promise<Blob>;
}

type ImageCaptureConstructor = new (track: MediaStreamTrack) => StillCamera;

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

function photoFile(blob: Blob | null): File | null {
  if (!blob || !blob.size || !Object.hasOwn(IMAGE_EXTENSIONS, blob.type)) return null;
  return new File([blob], `capture.${IMAGE_EXTENSIONS[blob.type]}`, {
    type: blob.type,
  });
}

function maximumDimension(capabilities: unknown, name: string): number | undefined {
  if (!capabilities || typeof capabilities !== 'object') return;
  const range = (capabilities as Record<string, unknown>)[name];
  if (!range || typeof range !== 'object' || !('max' in range)) return;
  const max = range.max;
  return typeof max === 'number' && Number.isFinite(max) && max > 0 ? max : undefined;
}

async function captureStill(video: HTMLVideoElement): Promise<File | null> {
  try {
    const ImageCapture = (
      globalThis as typeof globalThis & {
        ImageCapture?: ImageCaptureConstructor;
      }
    ).ImageCapture;
    const stream = video.srcObject as MediaStream | null;
    const track = stream?.getVideoTracks?.()[0];
    if (!ImageCapture || !track || track.readyState === 'ended') return null;
    const camera = new ImageCapture(track);
    if (!camera.takePhoto) return null;

    let settings: PhotoSettings | undefined;
    try {
      const capabilities = await camera.getPhotoCapabilities?.();
      const imageWidth = maximumDimension(capabilities, 'imageWidth');
      const imageHeight = maximumDimension(capabilities, 'imageHeight');
      if (imageWidth || imageHeight) {
        settings = {
          ...(imageWidth ? { imageWidth } : {}),
          ...(imageHeight ? { imageHeight } : {}),
        };
      }
    } catch {
      // Capability queries are optional; the camera may still take a photo.
    }
    if (!settings) return photoFile(await camera.takePhoto());
    try {
      return photoFile(await camera.takePhoto(settings));
    } catch {
      // Some cameras reject their reported maximums but support default still capture.
      return photoFile(await camera.takePhoto());
    }
  } catch {
    // Still capture is optional. Fall back to the camera's native video frame.
    return null;
  }
}

export async function capturePhoto(video: HTMLVideoElement): Promise<File | null> {
  const still = await captureStill(video);
  if (still) return still;
  if (
    video.readyState < 2 ||
    !Number.isFinite(video.videoWidth) ||
    !Number.isFinite(video.videoHeight) ||
    video.videoWidth <= 0 ||
    video.videoHeight <= 0
  ) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.95);
  });
  return photoFile(blob);
}
