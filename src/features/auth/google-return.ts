export const googleCompletionPath = '/auth/complete';
export const isGoogleCompletionDocument = [googleCompletionPath, `${googleCompletionPath}/`].includes(window.location.pathname);

// Both app entry and telemetry import this module before using the URL.
let pendingCompletionId: string | null = null;
if (isGoogleCompletionDocument && window.location.hash) {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  const ids = fragment.getAll('completionId');
  if (ids.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(ids[0]!)) {
    pendingCompletionId = ids[0]!;
  }
}

export function takeGoogleCompletionId() {
  const id = pendingCompletionId;
  pendingCompletionId = null;
  return id;
}
