import { useAuth, useShopMemberships } from '@/features/auth/supabase';
import type { MediaKind } from '@/features/uploads/types';
import { uploadMedia, type UploadProgress } from '@/features/uploads/upload';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
const MAX_BYTES = 10 * 1024 * 1024;

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
export const DOCUMENT_TYPES = [...IMAGE_TYPES, 'application/pdf'];
export function useCapturePage() {
  const { user, token } = useAuth();

  const { activeShopId } = useShopMemberships(user?.id);

  const [params] = useSearchParams();

  const navigate = useNavigate();

  const [kind, setKind] = useState<MediaKind>(
    ['receipt', 'recipe', 'product', 'order'].includes(params.get('kind') ?? '')
      ? (params.get('kind') as MediaKind)
      : 'receipt',
  );

  const [file, setFile] = useState<File | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  const [sourceChooserOpen, setSourceChooserOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const browseButtonRef = useRef<HTMLButtonElement>(null);
  const galleryButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!sourceChooserOpen) return;
    const browseButton = browseButtonRef.current;
    galleryButtonRef.current?.focus();
    return () => browseButton?.focus();
  }, [sourceChooserOpen]);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Object URLs are revoked so repeated captures do not leak memory.
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Start the camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    let active = true;

    if (file || sourceChooserOpen) return;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        if (active) {
          console.error('Camera access denied or unavailable', err);
          setError('Camera access denied or unavailable. You can still upload a file.');
        }
      }
    }

    void startCamera();

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [file, sourceChooserOpen]);

  const onPick = useCallback((picked: File | undefined) => {
    setSourceChooserOpen(false);
    if (!picked) return;
    setError(null);

    if (!DOCUMENT_TYPES.includes(picked.type)) {
      setError('Use a JPG, PNG, WebP, HEIC, or PDF file.');
      return;
    }
    if (picked.size > MAX_BYTES) {
      setError('That file is larger than 10 MB. Try a smaller photo.');
      return;
    }
    setFile(picked);
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    if (video.readyState < 2) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const newFile = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
        setFile(newFile);
      },
      'image/jpeg',
      0.9,
    );
  }, []);

  const submit = async () => {
    if (!file || !token || !activeShopId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await uploadMedia(file, kind, { token, shopId: activeShopId }, setProgress);
      navigate(kind === 'receipt' ? '/catalog?tab=receipts' : '/catalog');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed. Try again.');
      setProgress(null);
    } finally {
      setBusy(false);
    }
  };
  const handleClose = () => navigate(-1);
  const handleShutter = () => {
    if (file) void submit();
    else captureFrame();
  };
  const handleBrowse = () => setSourceChooserOpen(true);
  const closeSourceChooser = useCallback(() => setSourceChooserOpen(false), []);
  // React 18 does not expose the file input's native cancel event as a prop.
  useEffect(() => {
    if (!sourceChooserOpen) return;
    const inputs = [galleryInputRef.current, fileInputRef.current, cameraInputRef.current];
    inputs.forEach((input) => input?.addEventListener('cancel', closeSourceChooser));
    return () => {
      inputs.forEach((input) => input?.removeEventListener('cancel', closeSourceChooser));
    };
  }, [sourceChooserOpen, closeSourceChooser]);
  const chooseSource = useCallback((source: 'gallery' | 'file' | 'camera') => {
    const input = {
      gallery: galleryInputRef,
      file: fileInputRef,
      camera: cameraInputRef,
    }[source].current;
    try {
      if (!input) throw new Error('Upload picker unavailable');
      // Reset only the input, so cancelling keeps the current document selected.
      input.value = '';
      input.click();
    } catch {
      setError(
        'Could not open that source. Try Gallery or File explorer, or check camera permissions.',
      );
    }
  }, []);
  return {
    handleShutter,
    handleBrowse,
    sourceChooserOpen,
    closeSourceChooser,
    chooseSource,
    browseButtonRef,
    galleryButtonRef,
    kind,
    setKind,
    file,
    previewUrl,
    progress,
    error,
    busy,
    fileInputRef,
    galleryInputRef,
    cameraInputRef,
    videoRef,
    onPick,
    handleClose,
  };
}
export type CapturePageModel = ReturnType<typeof useCapturePage>;
