import type { CatalogStatus } from './CatalogStatusTag';

export function CatalogStatusIcon({ status }: { status: CatalogStatus }) {
  let content;
  switch (status) {
    case 'uploading':
      content = <>{[3, 8, 13].map((cx) => <circle key={cx} cx={cx} cy="8" r="1.4" fill="currentColor" stroke="none" />)}</>;
      break;
    case 'pending':
      content = <><circle cx="8" cy="8" r="6.25" /><path d="M8 4.7V8L10.1 9.3" /></>;
      break;
    case 'processing':
      content = <><circle cx="8" cy="8" r="6.25" strokeOpacity="0.3" /><path d="M8 1.75A6.25 6.25 0 0 1 14.25 8" /></>;
      break;
    case 'unverified':
      content = <><circle cx="8" cy="8" r="6.25" /><path d="M8 4.9V8.3" /><circle cx="8" cy="10.8" r="0.9" fill="currentColor" stroke="none" /></>;
      break;
    case 'verified':
      content = <><circle cx="8" cy="8" r="6.25" /><path d="M5.2 8.2L7.1 10L10.8 6.2" /></>;
      break;
    case 'failed':
      content = <><circle cx="8" cy="8" r="6.25" /><path d="M5.9 5.9L10.1 10.1M10.1 5.9L5.9 10.1" /></>;
  }
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{content}</svg>;
}
