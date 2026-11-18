import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type TransitionEvent,
} from "react";

export function useCatalogStatusTag() {
  const [expanded, setExpanded] = useState(false);
  const [labelWidth, setLabelWidth] = useState(0);
  const labelRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  useLayoutEffect(() => {
    const measure = () =>
      setLabelWidth(labelRef.current?.getBoundingClientRect().width ?? 0);
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    if (labelRef.current) observer?.observe(labelRef.current);
    return () => observer?.disconnect();
  }, []);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  function scheduleClose(delay: number) {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setExpanded(false), delay);
  }

  function toggle() {
    if (expanded) {
      clearTimeout(closeTimer.current);
      setExpanded(false);
      return;
    }
    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setExpanded(true);
    // Start the hold from actual transition completion; cover reduced motion
    // and interrupted transitions when no transition-end event is delivered.
    scheduleClose(1000 + (reducedMotion ? 0 : 300));
  }

  function handleTransitionEnd(event: TransitionEvent<HTMLButtonElement>) {
    if (
      expanded &&
      event.target === event.currentTarget &&
      event.propertyName === "width"
    ) {
      scheduleClose(1000);
    }
  }

  return { expanded, labelWidth, labelRef, toggle, handleTransitionEnd };
}
