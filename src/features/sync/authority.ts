import { beginApiRequest } from "@/lib/api-context";
import type { RequestOptions } from "@/lib/api";
import { scopeFor, type Scope } from "./types";

/** In-memory authority is required even for local reads; stored labels cannot unlock data. */
export function beginLocalOperation(
  context: RequestOptions,
  expectedScope?: Scope,
) {
  if (!context.identity || !context.shopId) {
    throw new DOMException("Sign in to access saved work", "AbortError");
  }
  const scope = scopeFor(context.identity, context.shopId);
  if (
    expectedScope &&
    (scope.key !== expectedScope.key ||
      scope.userId !== expectedScope.userId ||
      scope.shopId !== expectedScope.shopId)
  ) {
    throw new DOMException(
      "Saved work belongs to another identity",
      "AbortError",
    );
  }
  const lease = beginApiRequest(
    context.identity,
    context.signal,
    context.shopId,
  );
  try {
    lease.assertCurrent();
  } catch (error) {
    lease.dispose();
    throw error;
  }
  return { ...lease, scope };
}

export function isContextAbort(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "AbortError",
  );
}
