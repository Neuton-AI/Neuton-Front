import { useState } from 'react';
import type { SyncError } from './errors';

const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function useSyncPopup({
  title,
  message,
  errors,
  retry,
  exportPending,
  onSignIn,
}: {
  title: string;
  message: string;
  errors: SyncError[];
  retry: () => void;
  exportPending: () => Promise<void>;
  onSignIn: () => void;
}) {
  const [index, setIndex] = useState(0);
  const selected = errors[index % Math.max(errors.length, 1)];
  const text = selected?.message ?? message;
  const context = selected
    ? `${label(selected.entity)} · ${selected.operation === 'metadata-check' ? 'Sync' : label(selected.operation)}`
    : title;
  const recoveryPath =
    selected?.recovery === 'request-access'
      ? '/profile?tab=shop'
      : selected?.documentId && ['recipe', 'receipt', 'order'].includes(selected.entity)
        ? selected.entity === 'order'
          ? `/orders/${selected.documentId}`
          : `/catalog/${selected.entity}s/${selected.documentId}`
        : null;
  const recover = () => {
    if (selected?.recovery === 'sign-in') onSignIn();
    else if (selected?.recovery === 'export') void exportPending();
    else retry();
  };
  const recoveryLabel =
    selected?.recovery === 'sign-in'
      ? 'Sign in'
      : selected?.recovery === 'export'
        ? 'Export work'
        : selected?.recovery === 'request-access'
          ? 'Ask owner'
          : ['review-document', 'resolve-conflict'].includes(selected?.recovery ?? '')
            ? 'Review document'
            : 'Retry sync';
  return { index, setIndex, selected, text, context, recoveryPath, recover, recoveryLabel };
}
