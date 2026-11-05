// Evaluated before application modules or telemetry initialize.
let actionSecret: string | null = null;
let googleTicket: string | null = null;
let googleError: string | null = null;
if (
  typeof window !== "undefined" &&
  /^\/auth\/(confirm|reset-password|email-change|google\/complete)$/.test(
    window.location.pathname,
  )
) {
  const fragment = window.location.hash;
  if (fragment) {
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
    const parameters = new URLSearchParams(fragment.slice(1));
    const google = window.location.pathname === "/auth/google/complete";
    const candidate = parameters.get(google ? "ticket" : "token");
    if (candidate && /^[A-Za-z0-9_-]{43}$/.test(candidate)) {
      if (google) {
        googleTicket = candidate;
      } else {
        actionSecret = candidate;
      }
    }
    if (google) {
      const error = parameters.get("error");
      if (
        error &&
        [
          "GOOGLE_AUTH_FAILED",
          "GOOGLE_EMAIL_COLLISION",
          "GOOGLE_ALREADY_LINKED",
        ].includes(error)
      ) {
        googleError = error;
      }
    }
  }
}
export function readActionSecret(): string | null {
  return actionSecret;
}
export function clearActionSecret(): void {
  actionSecret = null;
}
export function readGoogleAction() {
  return { ticket: googleTicket, error: googleError };
}
export function clearGoogleAction(): void {
  googleTicket = null;
  googleError = null;
}
