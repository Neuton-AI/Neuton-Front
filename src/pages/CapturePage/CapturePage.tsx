import { ErrorState, InlineNotice, Spinner } from '@/components/feedback';
import { IconClose } from '@/components/icons';
import type { MediaKind } from '@/features/uploads/types';
import { type UploadProgress } from '@/features/uploads/upload';
import { useCapturePage } from './CapturePage.module';
import { IconUpload } from './IconUpload/IconUpload';
const KINDS: { key: MediaKind; label: string }[] = [
  { key: 'receipt', label: 'Receipt' },
  { key: 'recipe', label: 'Recipe' },
  { key: 'product', label: 'Product' },
  { key: 'order', label: 'Order' },
];

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

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
export function CapturePage() {
  const {
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
  } = useCapturePage();
  return (
    <div className="flex min-h-[100dvh] flex-col items-center overflow-hidden bg-[#181715] px-4 pb-8 pt-[max(var(--safe-top)+16px,16px)]">
      {/* Header */}
      <div className="relative mb-6 flex w-full max-w-[358px] items-center justify-center">
        <button
          type="button"
          aria-label="Close capture"
          onClick={handleClose}
          className="absolute left-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#252320]"
        >
          <IconClose className="h-[18px] w-[18px] text-[#FAF9F5]" strokeWidth={1.5} />
        </button>
        <span className="text-[18px] font-medium leading-[25px] text-[#FAF9F5]">Capture</span>
      </div>

      {/* Camera preview */}
      <div className="relative h-[370px] w-full max-w-[358px] shrink-0 overflow-hidden rounded-[16px] bg-[#1F1E1B]">
        {file ? (
          previewUrl ? (
            <img
              src={previewUrl}
              alt="Selected document preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-[#FAF9F5]">
              {file.name}
            </div>
          )
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              aria-label="Camera preview"
              onPointerUp={(event) => {
                if (event.isPrimary && event.button === 0) {
                  void handleFocus(event.clientX, event.clientY);
                }
              }}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Guides */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
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
            </div>
            {focusPoint ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-[#FAF9F5]"
                style={{ left: focusPoint.x, top: focusPoint.y }}
              />
            ) : null}
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
        disabled={busy || capturing}
        aria-label={file ? 'Upload document' : 'Take photo'}
        onClick={handleShutter}
        className="mt-4 flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border-[4px] border-[#FAF9F5] transition-opacity disabled:opacity-50"
      >
        {busy || capturing ? (
          <Spinner className="h-6 w-6 text-[#FAF9F5]" />
        ) : (
          <div className="h-[56px] w-[56px] rounded-full bg-[#FAF9F5]" />
        )}
      </button>

      {file && !busy ? (
        <>
          <p className="mt-3 text-sm text-[#FAF9F5]">Tap to upload {file.name}</p>
          <button
            type="button"
            onClick={handleRetake}
            className="mt-2 text-sm text-[#FAF9F5] underline"
          >
            Retake or choose another file
          </button>
        </>
      ) : null}

      <button
        type="button"
        disabled={busy || capturing}
        onClick={handleNativeCamera}
        className="mt-4 rounded-full bg-[#252320] px-4 py-2 text-sm font-medium text-[#FAF9F5] disabled:opacity-50"
      >
        Use phone camera
      </button>

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
        disabled={busy || capturing}
        onClick={handleBrowse}
        className="flex w-full max-w-[358px] flex-col items-center justify-center gap-1 rounded-[16px] border border-dashed border-[#A09D96] bg-[#1F1E1B] px-4 py-3.5 transition-opacity disabled:opacity-50"
      >
        <IconUpload className="h-[22px] w-[22px] text-[#A09D96]" />
        <span className="text-sm font-medium text-[#FAF9F5]">Drop a file here or browse</span>
        <span className="text-center text-[13px] font-medium leading-[18px] text-[#A09D96]">
          Receipt, recipe, product, or order &middot; JPG, PNG, WebP, HEIC, PDF
        </span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        aria-label="Choose document"
        accept={ACCEPTED.join(',')}
        className="sr-only"
        onChange={(event) => {
          onPick(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <input
        ref={nativeCameraInputRef}
        type="file"
        aria-label="Take photo with phone camera"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          onPick(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
