/**
 * Global test setup.
 *
 * `jest-dom` is imported here (rather than per-file) because its matchers patch
 * vitest's `expect` at module scope; importing it in one file would leave every
 * other file without the matchers *and* without the type augmentation.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { transferableAbortController } from 'node:util';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { server } from './mocks/server';

// Node's native Request rejects jsdom AbortSignals. Use the matching native
// controller for real fetch/MSW tests without changing browser production code.
globalThis.AbortController = transferableAbortController().constructor as typeof AbortController;
globalThis.AbortSignal = transferableAbortController().signal.constructor as typeof AbortSignal;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

afterEach(() => {
  cleanup();
});

// jsdom implements neither of these, and both are called by components under
// test (Sheet's scroll lock, CapturePage's object-URL preview).
if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:mock';
if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};

// jsdom defines `window.scrollTo` but throws "Not implemented" from it. Sheet.tsx
// calls it when it locks scrolling, so replace it unconditionally — a guarded
// assignment would never install, because jsdom's own stub is already truthy.
window.scrollTo = () => {};

// react-router reads this to decide whether a sheet was opened by navigation
// or arrived as a deep link (Sheet.useSheetClose). jsdom leaves it undefined.
if (!('idx' in (window.history.state ?? {}))) {
  window.history.replaceState({ idx: 0 }, '');
}

let previousHistory: { state: unknown; url: string };
beforeEach(() => {
  previousHistory = { state: window.history.state, url: window.location.href };
});
afterEach(() => {
  window.history.replaceState(previousHistory.state, '', previousHistory.url);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
