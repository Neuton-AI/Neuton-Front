import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ErrorState, InlineNotice, Spinner } from '../components/feedback';
import { IconCamera, IconChevronLeft, IconFile } from '../components/icons';
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

/**
 * Capture/upload screen. The file goes straight to R2 from the browser, so the
 * API only issues presigned URLs and enqueues the extraction job.
 */
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

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="shell">
      <div className="flex-1 px-4 pb-8 pt-[max(var(--safe-top)+16px,16px)]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="pressable -ml-1 flex items-center gap-1 py-2 text-label font-medium text-ink-muted"
        >
          <IconChevronLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="mt-1 font-display text-title text-ink">Add to catalog</h1>
        <p className="mt-1 text-body text-ink-muted">
          Neuton reads the document and files it for the shop automatically.
        </p>

        <div role="tablist" aria-label="Document type" className="mt-5 flex gap-1.5">
          {KINDS.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={kind === key}
              type="button"
              onClick={() => setKind(key)}
              className={`pressable flex-1 rounded-pill px-2 py-2 text-label font-medium transition-colors duration-200 ${
                kind === key
                  ? 'bg-surface-dark text-ink-on-dark'
                  : 'bg-surface-card text-ink-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {previewUrl ? (
            <div className="relative overflow-hidden rounded-card bg-surface-dark">
              <img
                src={previewUrl}
                alt="Selected document preview"
                className="max-h-[38vh] w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-hairline bg-surface-soft px-6 py-10 text-center">
              <p className="text-body text-ink-muted">No document selected yet</p>
              <p className="max-w-[34ch] text-label text-ink-muted-soft">
                JPEG, PNG, WebP, HEIC or PDF, up to 10 MB.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => cameraInputRef.current?.click()}
            className="pressable flex flex-col items-center gap-1.5 rounded-card bg-surface-card py-4 disabled:opacity-50"
          >
            <IconCamera className="h-6 w-6 text-brand-primary" />
            <span className="text-label font-medium text-ink">Camera</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="pressable flex flex-col items-center gap-1.5 rounded-card bg-surface-card py-4 disabled:opacity-50"
          >
            <IconFile className="h-6 w-6 text-brand-primary" />
            <span className="text-label font-medium text-ink">File</span>
          </button>
        </div>

        {/* capture="environment" opens the rear camera on phones. */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => onPick(event.target.files?.[0])}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="sr-only"
          onChange={(event) => onPick(event.target.files?.[0])}
        />

        {file ? (
          <p className="mt-3 truncate text-center text-label text-ink-muted-soft">{file.name}</p>
        ) : null}

        {error ? (
          <div className="mt-4">
            <ErrorState message={error} />
          </div>
        ) : null}

        {progress ? (
          <div className="mt-4">
            <InlineNotice>{describePhase(progress)}</InlineNotice>
          </div>
        ) : null}

        <button
          type="button"
          disabled={!file || busy}
          onClick={() => void submit()}
          className="pressable mt-5 flex w-full items-center justify-center gap-2 rounded-pill bg-brand-primary py-3.5 text-body font-medium text-ink-on-primary disabled:bg-brand-primary-disabled disabled:text-ink-muted"
        >
          {busy ? <Spinner className="h-5 w-5" /> : null}
          {busy ? 'Uploading…' : 'Upload and read'}
        </button>
      </div>
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