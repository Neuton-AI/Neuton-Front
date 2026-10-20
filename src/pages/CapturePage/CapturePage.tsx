import { ErrorState, InlineNotice, Spinner } from '@/components/feedback';
import { IconClose } from '@/components/icons';
import { Sheet } from '@/components/Sheet/Sheet';
import type { MediaKind } from '@/features/uploads/types';
import { type UploadProgress } from '@/features/uploads/upload';
import { DOCUMENT_TYPES, IMAGE_TYPES, useCapturePage } from './CapturePage.module';
import { IconUpload } from './IconUpload/IconUpload';
const KINDS: { key: MediaKind; label: string }[] = [
  { key: 'receipt', label: 'Receipt' },
  { key: 'recipe', label: 'Recipe' },
  { key: 'product', label: 'Product' },
  { key: 'order', label: 'Order' },
];

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
    sourceChooserOpen,
    closeSourceChooser,
    chooseSource,
    browseButtonRef,
    galleryButtonRef,
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
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Selected document preview"
            className="h-full w-full object-cover"
          />
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
        aria-label={file ? 'Upload document' : 'Take photo'}
        onClick={handleShutter}
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
      {error && !sourceChooserOpen ? (
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
        onClick={handleBrowse}
        ref={browseButtonRef}
        aria-haspopup="dialog"
        className="flex w-full max-w-[358px] flex-col items-center justify-center gap-1 rounded-[16px] border border-dashed border-[#A09D96] bg-[#1F1E1B] px-4 py-3.5 transition-opacity disabled:opacity-50"
      >
        <IconUpload className="h-[22px] w-[22px] text-[#A09D96]" />
        <span className="text-sm font-medium text-[#FAF9F5]">Drop a file here or browse</span>
        <span className="text-center text-[13px] font-medium leading-[18px] text-[#A09D96]">
          Receipt, recipe, product, or order &middot; JPG, PNG, WebP, HEIC, PDF
        </span>
      </button>

      <Sheet open={sourceChooserOpen} onClose={closeSourceChooser} label="Choose upload source">
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-5 py-4 text-ink">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Choose upload source</h2>
            <button type="button" aria-label="Close upload sources" onClick={closeSourceChooser}>
              <IconClose className="h-6 w-6" />
            </button>
          </div>
          {(
            [
              ['gallery', 'Gallery', 'Select an existing image'],
              ['file', 'File explorer', 'Select an image or PDF'],
              ['camera', 'Native camera', 'Take a new photo with your phone'],
            ] as const
          ).map(([source, label, description]) => (
            <button
              key={source}
              ref={source === 'gallery' ? galleryButtonRef : undefined}
              type="button"
              disabled={busy}
              onClick={() => chooseSource(source)}
              className="rounded-xl bg-surface-card px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
            >
              <span className="block font-medium">{label}</span>
              <span className="block text-sm text-ink-muted">{description}</span>
            </button>
          ))}
          <p className="text-sm text-ink-muted">
            Native camera depends on your phone and browser. If camera access is denied or
            unavailable, allow it in device settings or choose Gallery or File explorer. Your
            browser may show its own source picker.
          </p>
          {error ? <ErrorState message={error} /> : null}
        </div>
      </Sheet>
      {(
        [
          [galleryInputRef, 'Choose gallery image', IMAGE_TYPES, undefined],
          [fileInputRef, 'Choose document', DOCUMENT_TYPES, undefined],
          [cameraInputRef, 'Take native camera photo', IMAGE_TYPES, 'environment'],
        ] as const
      ).map(([ref, label, types, capture]) => (
        <input
          key={label}
          ref={ref}
          type="file"
          aria-label={label}
          accept={types.join(',')}
          capture={capture}
          hidden
          onChange={(event) => onPick(event.target.files?.[0])}
        />
      ))}
    </div>
  );
}
