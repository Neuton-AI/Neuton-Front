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
    } catch {
      if (!stopped)
        retry = setTimeout(() => {
          dirty = true;
          if (!running) void drain();
        }, 3000);
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
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        if (/^event: (reconcile|document-change)\r?$/m.test(frame)) receive();
      }
      if (buffer.length > 65536) throw new Error('Invalid sync event stream');
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

/** Provider-independent HTTP stream using the same-origin session cookie. */
export function connectLiveSync(
  context: { shopId: string; sessionId?: string | null; onInvalid?: (status: number) => void },
  receive: () => void,
) {
  const controller = new AbortController();
  let retry: ReturnType<typeof setTimeout> | undefined;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let attempt = 0;
  const connect = async () => {
    const connection = new AbortController();
    const abort = () => connection.abort();
    controller.signal.addEventListener('abort', abort, { once: true });
    const touch = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => connection.abort(), 45000);
    };
    try {
      touch();
      const response = await fetch('/api/v1/sync/events', {
        headers: {
          'x-shop-id': context.shopId,
          ...(context.sessionId ? { 'x-session-id': context.sessionId } : {}),
          Accept: 'text/event-stream',
        },
        signal: connection.signal,
        credentials: 'same-origin',
      });
      if (response.status === 401 || response.status === 403 || response.status === 503) {
        if (!controller.signal.aborted) context.onInvalid?.(response.status);
        return;
      }
      if (
        !response.ok ||
        !response.body ||
        !response.headers.get('content-type')?.includes('text/event-stream')
      )
        throw new Error('Sync stream unavailable');
      // Touch the watchdog on bytes, including heartbeat comments.
      const monitored = response.body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, output) {
            touch();
            output.enqueue(chunk);
          },
        }),
      );
      await readSyncEvents(monitored, () => {
        attempt = 0;
        receive();
      });
    } catch {
      /* Reconnect and reconcile after transport failure. */
    } finally {
      clearTimeout(watchdog);
      controller.signal.removeEventListener('abort', abort);
    }
    if (!controller.signal.aborted)
      retry = setTimeout(
        () => {
          void connect();
        },
        Math.min(
          30000,
          1000 * 2 ** Math.min(attempt++, 5) + Math.random() * 2000,
        ),
      );
  };
  void connect();
  return () => {
    controller.abort();
    clearTimeout(retry);
    clearTimeout(watchdog);
  };
}
