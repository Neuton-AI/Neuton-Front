import { useRef, type KeyboardEvent, type PointerEvent } from "react";

export function useCaptureReview({
  reviewIndex,
  count,
  setReviewIndex,
  setInstant,
}: {
  reviewIndex: number | null;
  count: number;
  setReviewIndex: (index: number) => void;
  setInstant: (instant: boolean) => void;
}) {
  const swipeStart = useRef<number | null>(null);
  const stepReview = (direction: -1 | 1) => {
    if (reviewIndex === null) return;
    setReviewIndex(Math.max(0, Math.min(count - 1, reviewIndex + direction)));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    setInstant(true);
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepReview(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      stepReview(1);
    }
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (swipeStart.current === null) swipeStart.current = event.clientX;
  };
  const onPointerCancel = () => {
    swipeStart.current = null;
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (
      swipeStart.current !== null &&
      Math.abs(event.clientX - swipeStart.current) > 48
    ) {
      setInstant(false);
      stepReview(event.clientX < swipeStart.current ? 1 : -1);
    }
    swipeStart.current = null;
  };
  return { stepReview, onKeyDown, onPointerDown, onPointerCancel, onPointerUp };
}
