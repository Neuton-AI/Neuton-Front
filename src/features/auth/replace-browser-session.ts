import type { AuthContextValue } from "./context";
import { resetCsrf } from "./csrf";
import { broadcastAuthEvent } from "./tab-events";

export async function replaceBrowserSession(
  auth: AuthContextValue,
  operation: () => Promise<void>,
) {
  const previous = auth.identity;
  try {
    await operation();
  } catch (error) {
    resetCsrf();
    await auth.refresh().catch(() => undefined);
    throw error;
  }
  resetCsrf();
  const session = await auth.refresh();
  if (
    !session ||
    session.user.id !== previous?.userId ||
    session.session.id === previous.sessionId
  ) {
    throw new Error("Sign in again to verify your session.");
  }
  broadcastAuthEvent("session-replaced");
  return session;
}
