import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { ErrorState, Spinner } from '@/components/feedback';
import { IconClose } from '@/components/icons';
import type { MediaKind } from '@/features/uploads/types';
import { useCapturePage } from './CapturePage.module';
import { CaptureDialog } from './CaptureDialog';
import { SourcePreview } from './SourcePreview';
import { IconUpload } from './IconUpload/IconUpload';
import './CapturePage.css';

const KINDS: { key: MediaKind; label: string }[] = [
  { key: 'receipt', label: 'Receipt' },
  { key: 'recipe', label: 'Recipe' },
  { key: 'product', label: 'Product' },
  { key: 'order', label: 'Order' },
];
const ACCEPTED = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';

function CaptureIcon({
  kind,
}: {
  kind: 'plus' | 'send' | 'delete' | 'replace';
}) {
  const paths = {
    plus: 'M12 5v14M5 12h14',
    send: 'M5 12.5l4.5 4.5L19 7',
    delete: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10 11v5M14 11v5',
    replace:
      'M4 10a8 8 0 0 1 14-5l2 2M20 3v4h-4M20 14a8 8 0 0 1-14 5l-2-2M4 21v-4h4',
  };
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={paths[kind]}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CaptureAction({
  label,
  variant = '',
  disabled,
  onClick,
  children,
}: {
  label: string;
  variant?: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`capture-action ${variant}`}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="capture-action-circle">{children}</span>
      <span>{label}</span>
    </button>
  );
}

export function CapturePage() {
  const model = useCapturePage();
  const {
    current,
    stacked,
    total,
    busy,
    adding,
    locked,
    kind,
    setKind,
    error,
    handleClose,
    handleBrowse,
    handleShutter,
    handleFocus,
    retake,
    addCurrent,
    submit,
    onPick,
    fileInputRef,
    galleryInputRef,
    nativeCameraInputRef,
    videoRef,
    previewRef,
    sourcePickerOpen,
    closeSourcePicker,
    chooseSource,
    reviewIndex,
    openReview,
    closeReview,
    setReviewIndex,
    deleteSource,
    moveSource,
    replaceSource,
    reviewSources,
    openCurrentReview,
  } = model;
  const [instant, setInstant] = useState(false);
  const swipeStart = useRef<number | null>(null);
  const sources = reviewSources;
  const selected = reviewIndex === null ? null : sources[reviewIndex];
  const editingDisabled = busy || adding || locked;
  const pickFiles = (event: ChangeEvent<HTMLInputElement>) => {
    onPick(event.target.files ?? undefined);
    event.target.value = '';
  };
  const stepReview = (direction: -1 | 1) => {
    if (reviewIndex === null) return;
    setReviewIndex(
      Math.max(0, Math.min(sources.length - 1, reviewIndex + direction)),
    );
  };

  return (
    <main
      className="capture-page"
      data-keyboard={instant || undefined}
      onPointerDownCapture={() => setInstant(false)}
      onKeyDownCapture={() => setInstant(true)}
    >
      <div className="capture-layout">
        <header className="capture-header">
          <button
            type="button"
            className="capture-close"
            aria-label="Close capture"
            disabled={busy || adding}
            onClick={handleClose}
          >
            <IconClose className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </button>
          <h1>Capture</h1>
        </header>
        <div className="capture-preview-area">
          <div className="capture-preview" ref={previewRef}>
            {current ? (
              <SourcePreview key={current.id} source={current} />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="capture-video"
                  onPointerDown={(event) =>
                    handleFocus(event.clientX, event.clientY)
                  }
                />
                <span className="capture-guide capture-guide--tl" />
                <span className="capture-guide capture-guide--tr" />
                <span className="capture-guide capture-guide--bl" />
                <span className="capture-guide capture-guide--br" />
              </>
            )}
          </div>
          {current && (
            <button
              type="button"
              className="capture-inspect"
              aria-label="Review current document"
              disabled={busy || adding}
              onClick={openCurrentReview}
            />
          )}
          <button
            type="button"
            data-capture-stack
            className="capture-stack"
            hidden={!stacked.length}
            aria-label={`Review ${stacked.length} saved ${stacked.length === 1 ? 'source' : 'sources'}`}
            disabled={busy || adding}
            onClick={() => openReview()}
          >
            {stacked
              .slice(0, 2)
              .reverse()
              .map((source, index) => (
                <span
                  key={source.id}
                  className={`capture-stack-card ${stacked.length > 1 && index === 0 ? 'capture-stack-card--back' : ''}`}
                >
                  <SourcePreview source={source} thumbnail />
                </span>
              ))}
            <span className="capture-stack-count">{stacked.length}</span>
          </button>
        </div>
        <div className="capture-kinds" aria-label="Document type">
          {KINDS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={kind === key}
              disabled={total > 0 || editingDisabled}
              onClick={() => setKind(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          className={`capture-controls${current ? ' capture-controls--captured' : ''}`}
        >
          {current ? (
            <>
              <CaptureAction
                label="Retake"
                variant="capture-action--retake"
                disabled={editingDisabled}
                onClick={retake}
              >
                <IconClose className="h-[22px] w-[22px]" />
              </CaptureAction>
              <CaptureAction
                label="Add"
                variant="capture-action--add"
                disabled={editingDisabled || total >= 4}
                onClick={() => void addCurrent(instant)}
              >
                <CaptureIcon kind="plus" />
              </CaptureAction>
              <CaptureAction
                label="Send"
                variant="capture-action--send"
                disabled={busy || adding}
                onClick={() => void submit()}
              >
                {busy ? (
                  <Spinner className="h-6 w-6" />
                ) : (
                  <CaptureIcon kind="send" />
                )}
                {total > 1 && (
                  <span className="capture-send-count">{total}</span>
                )}
              </CaptureAction>
            </>
          ) : (
            <>
              <button
                type="button"
                className="capture-shutter"
                aria-label="Take photo"
                disabled={editingDisabled || total >= 4}
                onClick={handleShutter}
              >
                <span />
              </button>
              {stacked.length > 0 && (
                <CaptureAction
                  label={busy ? 'Saving…' : 'Send'}
                  variant="capture-action--send capture-send-saved"
                  disabled={busy || adding || model.capturing}
                  onClick={() => void submit()}
                >
                  {busy ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <CaptureIcon kind="send" />
                  )}
                  <span className="capture-send-count">{total}</span>
                </CaptureAction>
              )}
            </>
          )}
        </div>
        <div className="capture-feedback" aria-live="polite">
          {error && <ErrorState message={error} />}
          {total >= 4 && !busy && (
            <p>4 of 4 sources. Send your document or review to make changes.</p>
          )}
        </div>
        <button
          type="button"
          className="capture-dropzone"
          disabled={editingDisabled || total >= 4}
          onClick={handleBrowse}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (!editingDisabled && total < 4) onPick(event.dataTransfer.files);
          }}
        >
          <IconUpload className="h-[22px] w-[22px]" />
          <strong>Drop a file here or browse</strong>
          <span>Supported files · JPG, PNG, WebP, HEIC, PDF</span>
          <span>Up to 4 files · 10 MB each · 40 MB total</span>
        </button>
      </div>
      <input
        ref={galleryInputRef}
        type="file"
        aria-label="Choose photos from gallery"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        hidden
        onChange={pickFiles}
      />
      <input
        ref={fileInputRef}
        type="file"
        aria-label="Choose document files"
        accept={ACCEPTED}
        multiple
        hidden
        onChange={pickFiles}
      />
      <input
        ref={nativeCameraInputRef}
        type="file"
        aria-label="Take a photo with device camera"
        accept="image/*"
        capture="environment"
        hidden
        onChange={pickFiles}
      />
      <CaptureDialog
        open={sourcePickerOpen}
        title="Choose upload source"
        className="capture-source-picker"
        instant={instant}
        onClose={closeSourcePicker}
      >
        <h2>Add a photo or file</h2>
        <p>Up to 4 sources · 10 MB each · 40 MB total</p>
        <button type="button" onClick={() => chooseSource('gallery')}>
          Photo gallery
        </button>
        <button type="button" onClick={() => chooseSource('file')}>
          Browse files
        </button>
        <button type="button" onClick={() => chooseSource('camera')}>
          Take a photo
        </button>
        <button
          type="button"
          className="capture-picker-cancel"
          onClick={closeSourcePicker}
        >
          Cancel
        </button>
      </CaptureDialog>
      <CaptureDialog
        open={reviewIndex !== null}
        title="Review document sources"
        className="capture-review"
        instant={instant}
        onClose={closeReview}
      >
        <header className="capture-header">
          <button
            type="button"
            className="capture-close"
            aria-label="Close review"
            onClick={closeReview}
          >
            <IconClose className="h-[18px] w-[18px]" />
          </button>
          <h2>Review</h2>
        </header>
        <div
          className="capture-carousel"
          role="region"
          tabIndex={0}
          aria-roledescription="carousel"
          aria-label="Document sources"
          onKeyDown={(event) => {
            setInstant(true);
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              stepReview(-1);
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              stepReview(1);
            }
          }}
          onPointerDown={(event) => {
            if (swipeStart.current === null) swipeStart.current = event.clientX;
          }}
          onPointerCancel={() => {
            swipeStart.current = null;
          }}
          onPointerUp={(event) => {
            if (
              swipeStart.current !== null &&
              Math.abs(event.clientX - swipeStart.current) > 48
            ) {
              setInstant(false);
              stepReview(event.clientX < swipeStart.current ? 1 : -1);
            }
            swipeStart.current = null;
          }}
        >
          <div
            className="capture-carousel-track"
            style={{
              transform: `translateX(calc(${reviewIndex ?? 0} * (80px - 100%)))`,
            }}
          >
            {sources.map((source, index) => (
              <article
                key={source.id}
                className="capture-review-card"
                aria-hidden={index !== reviewIndex}
                data-active={index === reviewIndex || undefined}
              >
                <SourcePreview source={source} />
                <span className="capture-review-count">
                  {index + 1} of {sources.length}
                </span>
              </article>
            ))}
          </div>
        </div>
        <nav className="capture-review-nav" aria-label="Navigate sources">
          <button
            type="button"
            disabled={reviewIndex === 0}
            onClick={() => stepReview(-1)}
          >
            ← Previous
          </button>
          <span aria-live="polite">
            {(reviewIndex ?? 0) + 1} of {sources.length}
          </span>
          <button
            type="button"
            disabled={reviewIndex === sources.length - 1}
            onClick={() => stepReview(1)}
          >
            Next →
          </button>
        </nav>
        <div className="capture-review-actions">
          <CaptureAction
            label="Delete"
            disabled={!selected || editingDisabled}
            onClick={() => {
              if (selected) deleteSource(selected.id);
            }}
          >
            <CaptureIcon kind="delete" />
          </CaptureAction>
          <CaptureAction
            label="Replace"
            disabled={!selected || editingDisabled}
            onClick={() => {
              if (selected) replaceSource(selected.id);
            }}
          >
            <CaptureIcon kind="replace" />
          </CaptureAction>
        </div>
        <div className="capture-reorder" aria-label="Reorder source">
          <button
            type="button"
            disabled={reviewIndex === 0 || editingDisabled}
            onClick={() => {
              if (selected) moveSource(selected.id, -1);
            }}
          >
            Move earlier
          </button>
          <button
            type="button"
            disabled={reviewIndex === sources.length - 1 || editingDisabled}
            onClick={() => {
              if (selected) moveSource(selected.id, 1);
            }}
          >
            Move later
          </button>
        </div>
        <button
          type="button"
          className="capture-review-done"
          onClick={closeReview}
        >
          Done
        </button>
      </CaptureDialog>
    </main>
  );
}
