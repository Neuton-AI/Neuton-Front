import { useEffect, type RefObject } from 'react';

const DISMISS_VIEWPORT_FRACTION = 0.25;
const DIRECTION_DISTANCE = 8;

/** Keep native scrolling until a deliberate downward pull claims the gesture. */
export function useSheetDrag(ref: RefObject<HTMLDivElement>, open: boolean, onClose: () => void) {
  useEffect(() => {
    const sheet = ref.current;
    if (!open || !sheet) return;
    let gesture: {
      x: number;
      y: number;
      distance: number;
      dragging: boolean;
    } | null = null;
    let suppressClick = false;

    const reset = () => {
      gesture = null;
      sheet.style.setProperty('--sheet-drag-y', '0px');
      sheet.removeAttribute('data-dragging');
    };
    const start = (target: EventTarget | null, x: number, y: number) => {
      reset();
      suppressClick = false;
      if (!(target instanceof Element) || target.closest('[role="dialog"]') !== sheet) return;
      if (
        target.closest(
          'button, a, input, textarea, select, [role="button"], [contenteditable="true"]',
        )
      )
        return;
      const handle = target.closest('[data-sheet-drag-handle], header');
      if (!handle) {
        // Check every ancestor: nested scrollers must also be at the top.
        for (let node: Element | null = target; node && node !== sheet; node = node.parentElement) {
          if (node.scrollTop > 0) return;
        }
      }
      gesture = { x, y, distance: 0, dragging: false };
    };
    const move = (x: number, y: number, event: Event) => {
      if (!gesture) return;
      const dx = x - gesture.x;
      const dy = y - gesture.y;
      if (!gesture.dragging) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < DIRECTION_DISTANCE) return;
        if (dy <= 0 || Math.abs(dx) >= dy || !event.cancelable) {
          reset();
          return;
        }
        gesture.dragging = true;
        suppressClick = true;
        sheet.setAttribute('data-dragging', '');
      }
      if (event.cancelable) event.preventDefault();
      gesture.distance = Math.max(0, dy);
      sheet.style.setProperty('--sheet-drag-y', `${gesture.distance}px`);
    };
    const finish = () => {
      const dismiss =
        gesture && gesture.dragging && gesture.distance > window.innerHeight * DISMISS_VIEWPORT_FRACTION;
      reset();
      if (dismiss) onClose();
    };
    const touchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        reset();
        return;
      }
      const touch = event.touches[0];
      start(event.target, touch.clientX, touch.clientY);
    };
    const touchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        reset();
        return;
      }
      move(event.touches[0].clientX, event.touches[0].clientY, event);
    };
    const mouseDown = (event: MouseEvent) => {
      if (event.button === 0) start(event.target, event.clientX, event.clientY);
    };
    const mouseMove = (event: MouseEvent) => move(event.clientX, event.clientY, event);
    const click = (event: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    };
    // React touch handlers are passive; a native non-passive listener lets us
    // cancel scrolling only for the pull-to-dismiss gesture, including on iOS.
    sheet.addEventListener('touchstart', touchStart, { passive: true });
    sheet.addEventListener('touchmove', touchMove, { passive: false });
    sheet.addEventListener('touchend', finish);
    sheet.addEventListener('touchcancel', reset);
    sheet.addEventListener('mousedown', mouseDown);
    window.addEventListener('mousemove', mouseMove);
    window.addEventListener('mouseup', finish);
    window.addEventListener('blur', reset);
    sheet.addEventListener('click', click, true);
    return () => {
      reset();
      sheet.removeEventListener('touchstart', touchStart);
      sheet.removeEventListener('touchmove', touchMove);
      sheet.removeEventListener('touchend', finish);
      sheet.removeEventListener('touchcancel', reset);
      sheet.removeEventListener('mousedown', mouseDown);
      window.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('mouseup', finish);
      window.removeEventListener('blur', reset);
      sheet.removeEventListener('click', click, true);
    };
  }, [ref, open, onClose]);
}
