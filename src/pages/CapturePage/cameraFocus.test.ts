import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enableContinuousFocus, focusAtPoint } from './cameraFocus';

function camera(capabilities: object = {}) {
  return {
    readyState: 'live',
    getCapabilities: vi.fn().mockReturnValue(capabilities),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
  } as unknown as MediaStreamTrack;
}

function preview(imageWidth: number, imageHeight: number, width = 200, height = 200) {
  return {
    videoWidth: imageWidth,
    videoHeight: imageHeight,
    getBoundingClientRect: () => ({ width, height, left: 10, top: 20 }),
  } as HTMLVideoElement;
}

beforeEach(() => {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getSupportedConstraints: () => ({ pointsOfInterest: true }) },
  });
});

describe('camera focus', () => {
  it('maps a horizontally cropped preview to the full image', async () => {
    const track = camera();
    expect(await focusAtPoint(track, preview(400, 200), 10, 20)).toBe(true);
    expect(track.applyConstraints).toHaveBeenCalledWith({
      advanced: [{ pointsOfInterest: [{ x: 0.25, y: 0 }] }],
    });
  });

  it('maps a vertically cropped preview and clamps coordinates', async () => {
    const track = camera();
    await focusAtPoint(track, preview(200, 400), 210, 220);
    expect(track.applyConstraints).toHaveBeenLastCalledWith({
      advanced: [{ pointsOfInterest: [{ x: 1, y: 0.75 }] }],
    });
    await focusAtPoint(track, preview(200, 200), -100, 500);
    expect(track.applyConstraints).toHaveBeenLastCalledWith({
      advanced: [{ pointsOfInterest: [{ x: 0, y: 1 }] }],
    });
  });

  it.each([
    [0, 200, 200, 200],
    [200, 0, 200, 200],
    [200, 200, 0, 200],
    [200, 200, 200, 0],
  ])('rejects invalid image or preview dimensions %s %s %s %s', async (iw, ih, width, height) => {
    const track = camera();
    expect(await focusAtPoint(track, preview(iw, ih, width, height), 10, 20)).toBe(false);
    expect(track.applyConstraints).not.toHaveBeenCalled();
  });

  it('keeps the focus mode unchanged for a point request', async () => {
    const track = camera({ focusMode: ['continuous', 'manual'] });
    await enableContinuousFocus(track);
    await focusAtPoint(track, preview(200, 200), 110, 120);
    expect(track.applyConstraints).toHaveBeenNthCalledWith(1, {
      advanced: [{ focusMode: 'continuous' }],
    });
    expect(track.applyConstraints).toHaveBeenNthCalledWith(2, {
      advanced: [{ focusMode: 'continuous', pointsOfInterest: [{ x: 0.5, y: 0.5 }] }],
    });
  });

  it('preserves resolution and other constraints across autofocus and consecutive taps', async () => {
    const track = camera({ focusMode: ['continuous'] });
    const resolution = { width: { ideal: 3840 }, height: { ideal: 2160 } };
    let constraints: MediaTrackConstraints = {
      ...resolution,
      facingMode: { ideal: 'environment' },
      advanced: [{ frameRate: 30 }],
    };
    track.getConstraints = vi.fn(() => constraints);
    vi.mocked(track.applyConstraints).mockImplementation(async (next) => {
      constraints = next ?? {};
    });
    await enableContinuousFocus(track);
    expect(constraints).toEqual({
      ...resolution,
      facingMode: { ideal: 'environment' },
      advanced: [{ frameRate: 30 }, { focusMode: 'continuous' }],
    });
    await focusAtPoint(track, preview(200, 200), 110, 120);
    await focusAtPoint(track, preview(200, 200), 10, 20);
    expect(constraints).toEqual({
      ...resolution,
      facingMode: { ideal: 'environment' },
      advanced: [
        { frameRate: 30 },
        { focusMode: 'continuous', pointsOfInterest: [{ x: 0, y: 0 }] },
      ],
    });
  });

  it('replaces stale point constraints without losing unrelated advanced settings', async () => {
    const track = camera();
    track.getConstraints = vi.fn().mockReturnValue({
      focusMode: 'manual',
      pointsOfInterest: [{ x: 0.1, y: 0.1 }],
      advanced: [{ pointsOfInterest: [{ x: 0.2, y: 0.2 }], frameRate: 24 }],
    });
    await focusAtPoint(track, preview(200, 200), 110, 120);
    expect(track.applyConstraints).toHaveBeenCalledWith({
      advanced: [
        { frameRate: 24 },
        { focusMode: 'manual', pointsOfInterest: [{ x: 0.5, y: 0.5 }] },
      ],
    });
  });

  it('does not require nonstandard point capabilities when the constraint is supported', async () => {
    const track = camera();
    vi.mocked(track.getCapabilities).mockImplementation(() => {
      throw new Error('unavailable');
    });
    expect(await focusAtPoint(track, preview(200, 200), 110, 120)).toBe(true);
  });

  it('supports devices exposing point capabilities without the constraint registry', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });
    expect(await focusAtPoint(camera({ pointsOfInterest: [] }), preview(200, 200), 110, 120)).toBe(
      true,
    );
    expect(await focusAtPoint(camera(), preview(200, 200), 110, 120)).toBe(false);
  });

  it('handles rejected, missing, throwing, and ended hardware silently', async () => {
    const log = vi.spyOn(console, 'error');
    const track = camera({ focusMode: ['continuous'] });
    vi.mocked(track.applyConstraints).mockRejectedValue(new Error('unsupported'));
    await expect(enableContinuousFocus(track)).resolves.toBeUndefined();
    expect(await focusAtPoint(track, preview(200, 200), 110, 120)).toBe(false);
    const ended = { readyState: 'ended' } as MediaStreamTrack;
    expect(await focusAtPoint(ended, preview(200, 200), 110, 120)).toBe(false);
    await expect(enableContinuousFocus(ended)).resolves.toBeUndefined();
    const unavailable = { readyState: 'live' } as MediaStreamTrack;
    expect(await focusAtPoint(unavailable, preview(200, 200), 110, 120)).toBe(false);
    await expect(enableContinuousFocus(unavailable)).resolves.toBeUndefined();
    expect(log).not.toHaveBeenCalled();
  });

  it('serializes point requests and skips work after a track ends', async () => {
    let finish!: () => void;
    const track = camera();
    vi.mocked(track.applyConstraints).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const first = focusAtPoint(track, preview(200, 200), 110, 120);
    const second = focusAtPoint(track, preview(200, 200), 10, 20);
    await Promise.resolve();
    expect(track.applyConstraints).toHaveBeenCalledOnce();
    Object.defineProperty(track, 'readyState', { value: 'ended' });
    finish();
    expect(await first).toBe(false);
    expect(await second).toBe(false);
    expect(track.applyConstraints).toHaveBeenCalledOnce();
  });
});
