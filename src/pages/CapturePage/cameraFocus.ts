type CameraCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  pointsOfInterest?: unknown;
};
type FocusConstraints = MediaTrackConstraintSet & {
  focusMode?: string;
  pointsOfInterest?: { x: number; y: number }[];
};

// Camera constraint requests must remain ordered when a user taps repeatedly.
const pendingRequests = new WeakMap<MediaStreamTrack, Promise<unknown>>();

function withFocusConstraints(
  track: MediaStreamTrack,
  update: FocusConstraints,
): MediaTrackConstraints {
  const previous = track.getConstraints?.() ?? {};
  const base = { ...previous } as MediaTrackConstraints & FocusConstraints;
  const focus: FocusConstraints = {};
  const retained: MediaTrackConstraintSet[] = [];
  // Move existing focus fields into one set so old points cannot override a new tap.
  for (const constraints of [base, ...(previous.advanced ?? [])]) {
    const settings = constraints as FocusConstraints;
    if (settings.focusMode !== undefined) focus.focusMode = settings.focusMode;
    if (settings.pointsOfInterest !== undefined) focus.pointsOfInterest = settings.pointsOfInterest;
  }
  delete base.focusMode;
  delete base.pointsOfInterest;
  delete base.advanced;
  for (const constraints of previous.advanced ?? []) {
    const settings = { ...constraints } as FocusConstraints;
    delete settings.focusMode;
    delete settings.pointsOfInterest;
    if (Object.keys(settings).length) retained.push(settings);
  }
  return { ...base, advanced: [...retained, { ...focus, ...update }] };
}

function supportsContinuousFocus(track: MediaStreamTrack): boolean {
  try {
    const capabilities = track.getCapabilities?.() as CameraCapabilities | undefined;
    return capabilities?.focusMode?.includes('continuous') === true;
  } catch {
    return false;
  }
}

function requestFocus<T>(
  track: MediaStreamTrack,
  fallback: T,
  request: () => Promise<T>,
): Promise<T> {
  const pending = pendingRequests.get(track) ?? Promise.resolve();
  const next = pending.then(async () => {
    if (track.readyState === 'ended') return fallback;
    try {
      return await request();
    } catch {
      return fallback;
    }
  });
  pendingRequests.set(track, next);
  return next;
}

/** Preserve the camera's autofocus where its exposed capabilities allow it. */
export function enableContinuousFocus(track: MediaStreamTrack): Promise<void> {
  return requestFocus(track, undefined, async () => {
    if (!supportsContinuousFocus(track) || !track.applyConstraints) return;
    const focus: FocusConstraints = { focusMode: 'continuous' };
    await track.applyConstraints(withFocusConstraints(track, focus));
  });
}

/** True means the request was accepted; the browser cannot confirm optical focus. */
export function focusAtPoint(
  track: MediaStreamTrack,
  video: HTMLVideoElement,
  clientX: number,
  clientY: number,
): Promise<boolean> {
  const bounds = video.getBoundingClientRect();
  const { videoWidth, videoHeight } = video;
  if (
    ![bounds.width, bounds.height, videoWidth, videoHeight].every(
      (size) => Number.isFinite(size) && size > 0,
    ) ||
    !Number.isFinite(clientX) ||
    !Number.isFinite(clientY)
  )
    return Promise.resolve(false);

  // object-fit: cover scales and centers the full camera image behind the preview.
  const scale = Math.max(bounds.width / videoWidth, bounds.height / videoHeight);
  const imageWidth = videoWidth * scale;
  const imageHeight = videoHeight * scale;
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  const point = {
    x: clamp((clientX - bounds.left + (imageWidth - bounds.width) / 2) / imageWidth),
    y: clamp((clientY - bounds.top + (imageHeight - bounds.height) / 2) / imageHeight),
  };

  return requestFocus(track, false, async () => {
    if (!track.applyConstraints) return false;
    // pointsOfInterest is a supported constraint, not a standard capabilities field.
    // Some devices also expose it on capabilities; either signal is sufficient.
    let supported = false;
    try {
      const constraints = navigator.mediaDevices?.getSupportedConstraints?.() as
        (MediaTrackSupportedConstraints & { pointsOfInterest?: boolean }) | undefined;
      supported = constraints?.pointsOfInterest === true;
    } catch {
      /* Device capability detection may still succeed. */
    }
    if (!supported) {
      const capabilities = track.getCapabilities?.() as CameraCapabilities | undefined;
      supported = Boolean(capabilities?.pointsOfInterest);
    }
    if (!supported) return false;
    const focus: FocusConstraints = {
      pointsOfInterest: [point],
      ...(supportsContinuousFocus(track) ? { focusMode: 'continuous' } : {}),
    };
    await track.applyConstraints(withFocusConstraints(track, focus));
    return track.readyState !== 'ended';
  });
}
