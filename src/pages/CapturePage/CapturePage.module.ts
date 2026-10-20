import { useAuth, useShopMemberships } from '@/features/auth/supabase';
import type { MediaKind } from '@/features/uploads/types';
import { uploadMedia, type UploadProgress } from '@/features/uploads/upload';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CAMERA_VIDEO_CONSTRAINTS, capturePhoto } from './cameraCapture';
import { enableContinuousFocus, focusAtPoint } from './cameraFocus';
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
  const [capturing, setCapturing] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const capturePendingRef = useRef(false);
  const captureVersionRef = useRef(0);
  const focusPendingRef = useRef(false);
  const autofocusRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!focusPoint) return;
    const timeout = window.setTimeout(() => setFocusPoint(null), 700);
    return () => window.clearTimeout(timeout);
  }, [focusPoint]);

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
          video: CAMERA_VIDEO_CONSTRAINTS,
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        if (track) autofocusRef.current = enableContinuousFocus(track);
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
      captureVersionRef.current += 1;
      streamRef.current = null;
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
    setCapturing(false);
    captureVersionRef.current += 1;
    setFocusPoint(null);
  }, []);

  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || capturePendingRef.current) return;
    capturePendingRef.current = true;
    setCapturing(true);
    const version = captureVersionRef.current;
    try {
      const captured = await capturePhoto(video);
      if (version === captureVersionRef.current && captured) onPick(captured);
    } catch {
      if (version === captureVersionRef.current) {
        setError('Could not take a photo. Try again or use your phone camera.');
      }
    } finally {
      capturePendingRef.current = false;
      if (version === captureVersionRef.current) setCapturing(false);
    }
  }, [onPick]);

  const handleFocus = useCallback(
    async (clientX: number, clientY: number) => {
      const video = videoRef.current;
      const stream = streamRef.current;
      const track = stream?.getVideoTracks()[0];
      if (!video || !track || file || busy || capturing || focusPendingRef.current) return;
      focusPendingRef.current = true;
      setFocusPoint(null);
      try {
        await autofocusRef.current;
        if (streamRef.current !== stream) return;
        const accepted = await focusAtPoint(track, video, clientX, clientY);
        if (accepted && streamRef.current === stream) {
          const bounds = video.getBoundingClientRect();
          // A request indicator, not a claim that the hardware locked focus.
          setFocusPoint({ x: clientX - bounds.left, y: clientY - bounds.top });
        }
      } catch {
        // Focus is optional; unsupported or rejected requests stay invisible.
      } finally {
        focusPendingRef.current = false;
      }
    },
    [file, busy, capturing],
  );

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
    if (busy || capturing) return;
    if (file) void submit();
    else void captureFrame();
  };
  const handleBrowse = () => fileInputRef.current?.click();
  const handleNativeCamera = () => nativeCameraInputRef.current?.click();
  const handleRetake = () => {
    if (busy || capturing) return;
    captureVersionRef.current += 1;
    setFile(null);
    setError(null);
    setFocusPoint(null);
  };
  return {
    handleShutter,
    handleBrowse,
    handleNativeCamera,
    handleRetake,
    handleFocus,
    focusPoint,
    kind,
    setKind,
    file,
    previewUrl,
    progress,
    error,
    busy,
    capturing,
    fileInputRef,
    nativeCameraInputRef,
    videoRef,
    onPick,
    handleClose,
  };
}
export type CapturePageModel = ReturnType<typeof useCapturePage>;
