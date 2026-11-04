// Evaluated before application modules or telemetry initialize.
let actionSecret: string | null = null;
if (
  typeof window !== "undefined" &&
  /^\/auth\/(confirm|reset-password|email-change)$/.test(
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
    const candidate = new URLSearchParams(fragment.slice(1)).get("token");
    if (candidate && /^[A-Za-z0-9_-]{43}$/.test(candidate)) {
      actionSecret = candidate;
    }
  }
}
export function readActionSecret(): string | null {
  return actionSecret;
}
export function clearActionSecret(): void {
  actionSecret = null;
}
