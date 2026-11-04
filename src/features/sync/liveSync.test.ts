import { setApiIdentity } from '@/lib/api-context';
import { beforeEach } from 'vitest';
beforeEach(() => setApiIdentity({ environment: 'test', userId: 'u1' }));
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  connectLiveSync,
  createSyncScheduler,
  readSyncEvents,
} from './liveSync';

describe('live sync', () => {
  afterEach(() => vi.restoreAllMocks());
  it('reconnects a dropped stream using header authentication and reconciles again', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const fetch = vi.fn().mockImplementation(
      async () =>
        new Response('event: reconcile\ndata: {}\n\n', {
          headers: { 'content-type': 'text/event-stream' },
        }),
    );
    vi.stubGlobal('fetch', fetch);
    const receive = vi.fn();
    const stop = connectLiveSync(
      {
        identity: { environment: 'test', userId: 'u1', sessionId: 'session-1' },
        shopId: 'shop',
      },
      receive,
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(receive).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(receive).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][1].headers).toMatchObject({
      'x-client-user-id': 'u1',
      'x-shop-id': 'shop',
    });
    stop();
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('adds jitter to reconnect backoff, caps the total, and cancels pending reconnects', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.75);
    const fetch = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetch);
    const stop = connectLiveSync(
      {
        identity: { environment: 'test', userId: 'u1', sessionId: 'session-1' },
        shopId: 'shop',
      },
      vi.fn(),
    );
    await vi.advanceTimersByTimeAsync(0);
    for (const delay of [2500, 3500, 5500, 9500, 17500, 30000, 30000]) {
      const calls = fetch.mock.calls.length;
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(fetch).toHaveBeenCalledTimes(calls);
      await vi.advanceTimersByTimeAsync(1);
      expect(fetch).toHaveBeenCalledTimes(calls + 1);
    }
    stop();
    const calls = fetch.mock.calls.length;
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetch).toHaveBeenCalledTimes(calls);
  });

  it('resets exponential backoff after reconciliation while retaining jitter', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(
        new Response('event: reconcile\ndata: {}\n\n', {
          headers: { 'content-type': 'text/event-stream' },
        }),
      )
      .mockRejectedValue(new Error('offline again'));
    vi.stubGlobal('fetch', fetch);
    const receive = vi.fn();
    const stop = connectLiveSync(
      {
        identity: { environment: 'test', userId: 'u1', sessionId: 'session-1' },
        shopId: 'shop',
      },
      receive,
    );
    await vi.advanceTimersByTimeAsync(2000);
    expect(receive).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(3);
    stop();
  });

  it.each([401, 403])(
    'does not reconnect after authorization failure %s',
    async (status) => {
      vi.useFakeTimers();
      const fetch = vi.fn().mockResolvedValue(new Response(null, { status }));
      vi.stubGlobal('fetch', fetch);
      const stop = connectLiveSync(
        {
          identity: {
            environment: 'test',
            userId: 'u1',
            sessionId: 'session-1',
          },
          shopId: 'shop',
        },
        vi.fn(),
      );
      await vi.advanceTimersByTimeAsync(60000);
      expect(fetch).toHaveBeenCalledTimes(1);
      stop();
    },
  );

  it('retries failed synchronization, and disposal stops retry work', async () => {
    vi.useFakeTimers();
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(undefined);
    const scheduler = createSyncScheduler(run);
    scheduler.request();
    await vi.advanceTimersByTimeAsync(3000);
    expect(run).toHaveBeenCalledTimes(2);
    scheduler.stop();
    scheduler.request();
    await vi.advanceTimersByTimeAsync(60000);
    expect(run).toHaveBeenCalledTimes(2);
  });
  it('retains an event arriving during synchronization and coalesces its burst', async () => {
    let release!: () => void;
    const run = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            release = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const scheduler = createSyncScheduler(run);
    scheduler.request();
    scheduler.request();
    scheduler.request();
    release();
    await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(2));
    scheduler.stop();
  });
  it('reads split SSE frames and ignores heartbeats', async () => {
    const receive = vi.fn();
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const part of [
          ': heartbeat\n\nevent: recon',
          'cile\r\ndata: {}\r\n\r',
          '\nevent: document-change\ndata: {}\n\n',
        ])
          controller.enqueue(encoder.encode(part));
        controller.close();
      },
    });
    await readSyncEvents(stream, receive);
    expect(receive).toHaveBeenCalledTimes(2);
  });
});
