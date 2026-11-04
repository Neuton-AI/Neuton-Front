import { ApiError } from "@/lib/api-error";
import {
  apiOrigin,
  beginApiRequest,
  currentApiEpoch,
  invalidateApiRequests,
} from "@/lib/api-context";
let token: string | undefined;
let acquiring: Promise<string> | undefined;

export function resetCsrf(): void {
  token = undefined;
  acquiring = undefined;
  invalidateApiRequests();
}
export function getCsrfToken(): Promise<string> {
  if (token) return Promise.resolve(token);
  if (acquiring) return acquiring;
  const epoch = currentApiEpoch();
  const request = beginApiRequest();
  const promise = (async () => {
    try {
      const response = await fetch(`${apiOrigin()}/api/v1/auth/csrf`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        signal: request.signal,
      });
      request.assertCurrent();
      if (!response.ok) {
        throw new ApiError(
          "Could not prepare a secure request. Please try again.",
          response.status,
          "CSRF_UNAVAILABLE",
        );
      }
      const body: unknown = await response.json();
      request.assertCurrent();
      if (
        !body ||
        typeof body !== "object" ||
        !("csrfToken" in body) ||
        typeof body.csrfToken !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(body.csrfToken)
      ) {
        throw new ApiError("Invalid authentication response", 502);
      }
      token = body.csrfToken;
      return token;
    } catch (error) {
      if (
        error instanceof ApiError ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        throw error;
      }
      throw new ApiError("Cannot reach the server. Please try again.", 0);
    } finally {
      request.dispose();
      if (epoch === currentApiEpoch()) acquiring = undefined;
    }
  })();
  acquiring = promise;
  return promise;
}
