import { IconClose } from '@/components/icons';
import { CaptureDialog } from '../CaptureDialog';
import type { CapturePageModel } from '../CapturePage.module';
import { CaptureReviewActions } from './CaptureReviewActions';
import { CaptureReviewCarousel } from './CaptureReviewCarousel';
import { useCaptureReview } from './CaptureReview.module';

type Props = {
  model: CapturePageModel;
  instant: boolean;
  setInstant: (instant: boolean) => void;
};

export function CaptureReview({ model, instant, setInstant }: Props) {
  const sources = model.reviewSources;
  const review = useCaptureReview({
    reviewIndex: model.reviewIndex,
    count: sources.length,
    setReviewIndex: model.setReviewIndex,
    setInstant,
  });
  const selected = model.reviewIndex === null ? null : sources[model.reviewIndex];
  return (
    <CaptureDialog
      open={model.reviewIndex !== null}
      title="Review document sources"
      className="capture-review"
      instant={instant}
      onClose={model.closeReview}
    >
      <header className="capture-header">
        <button type="button" className="capture-close" aria-label="Close review" onClick={model.closeReview}>
          <IconClose className="h-[18px] w-[18px]" />
        </button>
        <h2>Review</h2>
      </header>
      <CaptureReviewCarousel
        sources={sources}
        reviewIndex={model.reviewIndex}
        onKeyDown={review.onKeyDown}
        onPointerDown={review.onPointerDown}
        onPointerCancel={review.onPointerCancel}
        onPointerUp={review.onPointerUp}
      />
      <nav className="capture-review-nav" aria-label="Navigate sources">
        <button type="button" disabled={model.reviewIndex === 0} onClick={() => review.stepReview(-1)}>
          ← Previous
        </button>
        <span aria-live="polite">
          {(model.reviewIndex ?? 0) + 1} of {sources.length}
        </span>
        <button
          type="button"
          disabled={model.reviewIndex === sources.length - 1}
          onClick={() => review.stepReview(1)}
        >
          Next →
        </button>
      </nav>
      <CaptureReviewActions
        selected={selected}
        reviewIndex={model.reviewIndex}
        count={sources.length}
        disabled={model.locked}
        deleteSource={model.deleteSource}
        replaceSource={model.replaceSource}
        moveSource={model.moveSource}
      />
      <button type="button" className="capture-review-done" onClick={model.closeReview}>
        Done
      </button>
    </CaptureDialog>
  );
}
