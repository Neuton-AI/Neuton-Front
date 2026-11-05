import { authClient } from "./client";
import { clearGoogleAction, readGoogleAction } from "./action-fragment";

let completion: ReturnType<typeof authClient.completeGoogle> | null = null;

/** React StrictMode and session-boundary remounts must share the one-use POST. */
export function completeCapturedGoogle() {
  if (completion) return completion;
  const { ticket, error } = readGoogleAction();
  clearGoogleAction();
  if (error === "GOOGLE_EMAIL_COLLISION") {
    completion = Promise.reject(
      new Error(
        "Sign in with your existing method, then link Google in account settings.",
      ),
    );
  } else if (error === "GOOGLE_ALREADY_LINKED") {
    completion = Promise.reject(
      new Error(
        "This Google account is already linked. Sign in with your existing method.",
      ),
    );
  } else if (!ticket || error) {
    completion = Promise.reject(
      new Error(
        "Google sign-in was cancelled or expired, or this browser lost its sign-in context. Start again.",
      ),
    );
  } else {
    completion = authClient.completeGoogle(ticket);
  }
  return completion;
}
