import { isContextAbort } from "./authority";
import {
  apiOrigin,
  beginApiRequest,
  type AuthIdentity,
} from "@/lib/api-context";
/** One active run plus a trailing run for hints received while it is busy. */
export function createSyncScheduler(run: () => Promise<void>) {
  let dirty = false,
    running = false,
    stopped = false;
  let retry: ReturnType<typeof setTimeout> | undefined;
  const drain = async () => {
    running = true;
    try {
      while (dirty && !stopped) {
        dirty = false;
        await run();
      }
    } catch (error) {
      if (isContextAbort(error)) {
        stopped = true;
        return;
      }
      if (!stopped) {
        retry = setTimeout(() => {
          dirty = true;
          if (!running) void drain();
        }, 3000);
      }
    } finally {
      running = false;
    }
  };
  return {
    request() {
      clearTimeout(retry);
      dirty = true;
      if (!running && !stopped) void drain();
    },
    stop() {
      stopped = true;
      dirty = false;
      clearTimeout(retry);
    },
  };
}

export async function readSyncEvents(
  body: ReadableStream<Uint8Array>,
  receive: () => void,
  signal?: AbortSignal,
) {
  const reader = body.getReader();
  const abort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (signal?.aborted) {
        throw new DOMException("Stream context changed", "AbortError");
      }
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        if (/^event: (reconcile|document-change)\r?$/m.test(frame)) receive();
      }
      if (buffer.length > 65536) throw new Error("Invalid sync event stream");
    }
  } finally {
    signal?.removeEventListener("abort", abort);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

/** Cookies authorize the stream; only the current identity and shop may receive hints. */
export function connectLiveSync(
  context: { identity: AuthIdentity; shopId: string },
  receive: () => void,
) {
  if (context.identity.offline || !navigator.onLine) return () => undefined;
  const controller = new AbortController();
  const authority = beginApiRequest(
    context.identity,
    controller.signal,
    context.shopId,
  );
  const stopStale = () => controller.abort();
  authority.signal.addEventListener("abort", stopStale, { once: true });
  let retry: ReturnType<typeof setTimeout> | undefined;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let attempt = 0;
  const connect = async () => {
    if (controller.signal.aborted) return;
    if (
      context.identity.expiresAt !== undefined &&
      context.identity.expiresAt <= Date.now()
    ) {
      controller.abort();
      window.dispatchEvent(new Event("neuton-shop-access-lost"));
      return;
    }
    const connection = new AbortController();
    const abort = () => connection.abort();
    controller.signal.addEventListener("abort", abort, { once: true });
    const touch = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => connection.abort(), 45000);
    };
    const request = beginApiRequest(
      context.identity,
      connection.signal,
      context.shopId,
    );
    try {
      request.assertCurrent();
      touch();
      const response = await fetch(`${apiOrigin()}/api/v1/sync/events`, {
        headers: {
          "x-client-user-id": context.identity.userId,
          "x-shop-id": context.shopId,
          Accept: "text/event-stream",
        },
        signal: request.signal,
        credentials: "include",
      });
      request.assertCurrent();
      if (response.status === 401 || response.status === 403) {
        controller.abort();
        window.dispatchEvent(new Event("neuton-shop-access-lost"));
        return;
      }
      if (
        !response.ok ||
        !response.body ||
        !response.headers.get("content-type")?.includes("text/event-stream")
      ) {
        throw new Error("Sync stream unavailable");
      }
      // Touch the watchdog on bytes, including heartbeat comments.
      const monitored = response.body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, output) {
            request.assertCurrent();
            touch();
            output.enqueue(chunk);
          },
        }),
      );
      await readSyncEvents(
        monitored,
        () => {
          request.assertCurrent();
          attempt = 0;
          receive();
        },
        request.signal,
      );
    } catch {
      /* Reconnect and reconcile after transport failure. */
    } finally {
      request.dispose();
      clearTimeout(watchdog);
      controller.signal.removeEventListener("abort", abort);
    }
    if (!controller.signal.aborted) {
      try {
        authority.assertCurrent();
      } catch {
        return;
      }
      retry = setTimeout(
        () => {
          void connect();
        },
        Math.min(
          30000,
          1000 * 2 ** Math.min(attempt++, 5) + Math.random() * 2000,
        ),
      );
    }
  };
  void connect();
  return () => {
    authority.signal.removeEventListener("abort", stopStale);
    controller.abort();
    authority.dispose();
    clearTimeout(retry);
    clearTimeout(watchdog);
  };
}
