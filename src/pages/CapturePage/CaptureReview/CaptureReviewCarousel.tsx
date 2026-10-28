import type { KeyboardEvent, PointerEvent } from 'react';
import type { CaptureSource } from '../CapturePage.module';
import { SourcePreview } from '../SourcePreview';

export function CaptureReviewCarousel({
  sources,
  reviewIndex,
  onKeyDown,
  onPointerDown,
  onPointerCancel,
  onPointerUp,
}: {
  sources: CaptureSource[];
  reviewIndex: number | null;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: () => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className="capture-carousel"
      role="region"
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="Document sources"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerCancel={onPointerCancel}
      onPointerUp={onPointerUp}
    >
      <div
        className="capture-carousel-track"
        style={{ transform: `translateX(calc(${reviewIndex ?? 0} * (80px - 100%)))` }}
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
  );
}
