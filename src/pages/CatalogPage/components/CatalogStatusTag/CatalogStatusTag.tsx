import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReceiptStatus } from '@/features/receipts/types';
import { CatalogStatusIcon } from './CatalogStatusIcon';
import './CatalogStatusTag.css';

export type CatalogStatus = ReceiptStatus | 'uploading';

const LABELS: Record<CatalogStatus, string> = {
  uploading: 'Uploading', pending: 'Pending', processing: 'Processing',
  unverified: 'Unverified', verified: 'Verified', failed: 'Failed',
};

export function CatalogStatusTag({ status }: { status: CatalogStatus }) {
  return <StatusTag key={status} status={status} />;
}

function StatusTag({ status }: { status: CatalogStatus }) {
  const [expanded, setExpanded] = useState(false);
  const [labelWidth, setLabelWidth] = useState(0);
  const labelRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const label = LABELS[status];

  useLayoutEffect(() => {
    const measure = () => setLabelWidth(labelRef.current?.getBoundingClientRect().width ?? 0);
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (labelRef.current) observer?.observe(labelRef.current);
    return () => observer?.disconnect();
  }, []);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  function scheduleClose(delay: number) {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setExpanded(false), delay);
  }

  function expand() {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setExpanded(true);
    // The transition-end handler starts the hold from the actual completion.
    // This fallback also covers reduced motion and interrupted transitions.
    scheduleClose(2000 + (reducedMotion ? 0 : 300));
  }

  return (
    <button
      type="button"
      aria-label={`Status: ${label}`}
      aria-expanded={expanded}
      className={`catalog-status-tag catalog-status-tag--${status}`}
      data-expanded={expanded}
      style={{ width: expanded ? labelWidth + 46 : 24 }}
      onClick={expand}
      onTransitionEnd={(event) => {
        if (expanded && event.target === event.currentTarget && event.propertyName === 'width') {
          scheduleClose(2000);
        }
      }}
    >
      <span className="catalog-status-tag__label" aria-hidden="true">
        <span ref={labelRef}>{label}</span>
      </span>
      <CatalogStatusIcon status={status} />
    </button>
  );
}
