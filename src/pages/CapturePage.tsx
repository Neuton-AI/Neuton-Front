import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ErrorState, InlineNotice, Spinner } from '../components/feedback';
import { IconClose } from '../components/icons';
import type { MediaKind } from '../lib/api';
import { uploadMedia, type UploadProgress } from '../lib/upload';
import { useAuth, useShopMemberships } from '../lib/supabase';

const KINDS: { key: MediaKind; label: string }[] = [
  { key: 'receipt', label: 'Receipt' },
  { key: 'recipe', label: 'Recipe' },
  { key: 'product', label: 'Product' },
  { key: 'order', label: 'Order' },
];

const MAX_BYTES = 10 * 1024 * 1024;

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

function IconUpload(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth={1.83} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2.75 13.75v1.83a2.75 2.75 0 0 0 2.75 2.75h11a2.75 2.75 0 0 0 2.75-2.75v-1.83" />
      <path d="M6.42 7.33 11 2.75l4.58 4.58" />
      <path d="M11 2.75v11" />
    </svg>
  );
}

export function CapturePage() {
  const { user, token } = useAuth();
  const { activeShopId } = useShopMemberships(user?.id);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [kind, setKind] = useState<MediaKind>(
    (params.get('kind') as MediaKind | null) ?? 'receipt',
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
        if (active && videoRef.current) {
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
      setError('Use a JPEG, PNG, WebP, HEIC or PDF file.');
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
    if (!file || !token || !activeShopId) return;
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

  return (
    <div className="flex min-h-[100dvh] flex-col items-center overflow-hidden bg-[#181715] px-4 pb-8 pt-[max(var(--safe-top)+16px,16px)]">
      {/* Header */}
      <div className="relative mb-6 flex w-full max-w-[358px] items-center justify-center">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#252320]"
        >
          <IconClose className="h-[18px] w-[18px] text-[#FAF9F5]" strokeWidth={1.5} />
        </button>
        <span className="text-[18px] font-medium leading-[25px] text-[#FAF9F5]">Capture</span>
      </div>

      {/* Camera preview */}
      <div className="relative h-[370px] w-full max-w-[358px] shrink-0 overflow-hidden rounded-[16px] bg-[#1F1E1B]">
        {previewUrl ? (
          <img src={previewUrl} alt="Selected document preview" className="h-full w-full object-cover" />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Guides */}
            <div className="absolute left-7 top-7 h-1 w-9 rounded-sm bg-[#FAF9F5]" />
            <div className="absolute left-7 top-7 h-9 w-1 rounded-sm bg-[#FAF9F5]" />
            <div className="absolute right-7 top-7 h-1 w-9 rounded-sm bg-[#FAF9F5]" />
            <div className="absolute right-7 top-7 h-9 w-1 rounded-sm bg-[#FAF9F5]" />
            <div className="absolute bottom-7 left-7 h-1 w-9 rounded-sm bg-[#FAF9F5]" />
            <div className="absolute bottom-7 left-7 h-9 w-1 rounded-sm bg-[#FAF9F5]" />
            <div className="absolute bottom-7 right-7 h-1 w-9 rounded-sm bg-[#FAF9F5]" />
            <div className="absolute bottom-7 right-7 h-9 w-1 rounded-sm bg-[#FAF9F5]" />

            <div className="absolute bottom-[48px] left-1/2 -translate-x-1/2 rounded-full bg-[#252320] px-[14px] py-[8px]">
              <span className="whitespace-nowrap text-[13px] font-medium leading-[18px] text-[#FAF9F5]">
                Align receipt within frame
              </span>
            </div>
          </>
        )}
      </div>

      {/* Type chips */}
      <div className="no-scrollbar mt-5 flex w-full max-w-[358px] justify-center gap-2 overflow-x-auto pb-1">
        {KINDS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setKind(key)}
            className={`shrink-0 rounded-full px-4 py-2 transition-colors ${
              kind === key ? 'bg-[#CC785C] text-[#FFFFFF]' : 'bg-[#252320] text-[#A09D96]'
            }`}
          >
            <span className="text-sm font-medium leading-[17px]">{label}</span>
          </button>
        ))}
      </div>

      {/* Shutter */}
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (file) {
            void submit();
          } else {
            captureFrame();
          }
        }}
        className="mt-4 flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border-[4px] border-[#FAF9F5] transition-opacity disabled:opacity-50"
      >
        {busy ? (
          <Spinner className="h-6 w-6 text-[#FAF9F5]" />
        ) : (
          <div className="h-[56px] w-[56px] rounded-full bg-[#FAF9F5]" />
        )}
      </button>

      {file && !busy ? (
        <p className="mt-3 text-sm text-[#FAF9F5]">Tap to upload {file.name}</p>
      ) : null}

      <div className="flex-1 min-h-[16px]" />

      {/* Error/Progress */}
      {error ? (
        <div className="mb-4 w-full max-w-[358px]">
          <ErrorState message={error} />
        </div>
      ) : null}

      {progress ? (
        <div className="mb-4 w-full max-w-[358px]">
          <InlineNotice>{describePhase(progress)}</InlineNotice>
        </div>
      ) : null}

      {/* Drop zone */}
      <button
        type="button"
        disabled={busy}
        onClick={() => fileInputRef.current?.click()}
        className="flex w-full max-w-[358px] flex-col items-center justify-center gap-1 rounded-[16px] border border-dashed border-[#A09D96] bg-[#1F1E1B] px-4 py-3.5 transition-opacity disabled:opacity-50"
      >
        <IconUpload className="h-[22px] w-[22px] text-[#A09D96]" />
        <span className="text-sm font-medium text-[#FAF9F5]">Drop a file here or browse</span>
        <span className="text-center text-[13px] font-medium leading-[18px] text-[#A09D96]">
          Receipt, recipe or product image &middot; JPG, PNG, PDF
        </span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="sr-only"
        onChange={(event) => onPick(event.target.files?.[0])}
      />
    </div>
  );
}

function describePhase(progress: UploadProgress): string {
  switch (progress.phase) {
    case 'presigning':
      return 'Preparing a secure upload link…';
    case 'uploading':
      return 'Sending the file to storage…';
    case 'queueing':
      return 'Queued. Neuton is reading the document.';
    case 'done':
      return 'Done. Your document is being processed.';
  }
}