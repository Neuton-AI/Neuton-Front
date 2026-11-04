export interface AuthIdentity {
  environment: string;
  userId: string;
  sessionId?: string;
  generation?: number;
  shopId?: string | null;
  offline?: boolean;
  expiresAt?: number;
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
  window.dispatchEvent(new Event("neuton-authority-change"));
}
export function setApiIdentity(next: AuthIdentity | null): void {
  if (
    identity?.userId !== next?.userId ||
    identity?.environment !== next?.environment ||
    identity?.sessionId !== next?.sessionId ||
    identity?.generation !== next?.generation ||
    identity?.shopId !== next?.shopId ||
    Boolean(identity?.offline) !== Boolean(next?.offline)
  ) {
    invalidateApiRequests();
  }
  identity = next;
}
export function beginApiRequest(
  expected?: AuthIdentity | null,
  external?: AbortSignal,
  shopId?: string | null,
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
          expected.environment !== identity?.environment ||
          expected.sessionId !== identity?.sessionId ||
          expected.generation !== identity?.generation ||
          (identity?.shopId !== undefined &&
            shopId !== undefined &&
            shopId !== identity.shopId)))
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
