import { describe, expect, it, vi } from 'vitest';
import {
  connectLiveSync,
  createSyncScheduler,
  readSyncEvents,
} from './liveSync';

describe('live sync', () => {
  it('reconnects a dropped stream using header authentication and reconciles again', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockImplementation(
      async () =>
        new Response('event: reconcile\ndata: {}\n\n', {
          headers: { 'content-type': 'text/event-stream' },
        }),
    );
    vi.stubGlobal('fetch', fetch);
    const receive = vi.fn();
    const stop = connectLiveSync({ token: 'fixture', shopId: 'shop' }, receive);
    await vi.advanceTimersByTimeAsync(0);
    expect(receive).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(receive).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][1].headers).toMatchObject({
      Authorization: 'Bearer fixture',
      'x-shop-id': 'shop',
    });
    stop();
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
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
