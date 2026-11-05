const events = new Set([
  "account-changed",
  "logged-out",
  "session-replaced",
  "membership-refresh",
]);
export function isAuthTabEvent(value: unknown): boolean {
  return typeof value === "string" && events.has(value);
}
export function broadcastAuthEvent(
  event:
    | "account-changed"
    | "logged-out"
    | "session-replaced"
    | "membership-refresh",
) {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel("neuton-auth");
  channel.postMessage(event);
  channel.close();
}
