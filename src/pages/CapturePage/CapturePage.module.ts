import { useAuth, useShopMemberships } from '@/features/auth/supabase';
import type { MediaKind } from '@/features/uploads/types';
import { uploadMedia, type UploadProgress } from '@/features/uploads/upload';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
const MAX_BYTES = 10 * 1024 * 1024;

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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

    if (file) return;

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
        console.error('Camera access denied or unavailable', err);
        if (active) {
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
  }, [file]);

  const onPick = useCallback((picked: File | undefined) => {
    if (!picked) return;
    setError(null);

    if (!ACCEPTED.includes(picked.type)) {
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
  const handleBrowse = () => {
    const input = fileInputRef.current;
    if (!input) return;
    // Let the browser open its native picker. Clearing the input allows the
    // same file to be chosen again without discarding the current selection.
    input.value = '';
    input.click();
  };
  return {
    handleShutter,
    handleBrowse,
    kind,
    setKind,
    file,
    previewUrl,
    progress,
    error,
    busy,
    fileInputRef,
    videoRef,
    onPick,
    handleClose,
  };
}
export type CapturePageModel = ReturnType<typeof useCapturePage>;
