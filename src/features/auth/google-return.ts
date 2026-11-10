export type GooglePurpose = 'sign_in' | 'link';
export const googleCompletionPath = '/auth/complete';
export const isGoogleCompletionDocument = [googleCompletionPath, `${googleCompletionPath}/`].includes(window.location.pathname);

// Both app entry and telemetry import this module before using the URL.
let pendingCompletion: { completionId: string; purpose: GooglePurpose } | null = null;
if (isGoogleCompletionDocument && window.location.hash) {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  const ids = fragment.getAll('completionId');
  const purposes = fragment.getAll('purpose');
  if (ids.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(ids[0]!) &&
    (purposes.length === 0 || (purposes.length === 1 && purposes[0] === 'link'))) {
    pendingCompletion = { completionId: ids[0]!, purpose: purposes.length ? 'link' : 'sign_in' };
  }
}

export function takeGoogleCompletion() {
  const completion = pendingCompletion;
  pendingCompletion = null;
  return completion;
}
