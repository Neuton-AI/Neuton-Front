export interface AuthIdentity {
  environment: string;
  userId: string;
  sessionId?: string;
}
let identity: AuthIdentity | null = null;
let epoch = 0;
const pending = new Set<AbortController>();
export const apiOrigin = () => window.location.origin;
export const currentApiEpoch = () => epoch;
export function invalidateApiRequests(): void {
  epoch += 1;
  for (const controller of pending) controller.abort();
  pending.clear();
}
export function setApiIdentity(next: AuthIdentity | null): void {
  if (
    identity?.userId !== next?.userId ||
    identity?.environment !== next?.environment
  ) {
    invalidateApiRequests();
  }
  identity = next;
}
export function beginApiRequest(
  expected?: AuthIdentity | null,
  external?: AbortSignal,
) {
  const capturedEpoch = epoch;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (external?.aborted) controller.abort();
  external?.addEventListener("abort", abort, { once: true });
  pending.add(controller);
  const assertCurrent = () => {
    if (
      expected === null ||
      controller.signal.aborted ||
      capturedEpoch !== epoch ||
      (expected &&
        (expected.userId !== identity?.userId ||
          expected.environment !== identity?.environment))
    ) {
      throw new DOMException("Account context changed", "AbortError");
    }
  };
  return {
    signal: controller.signal,
    assertCurrent,
    dispose() {
      pending.delete(controller);
      external?.removeEventListener("abort", abort);
    },
  };
}
