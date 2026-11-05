import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ initialize: vi.fn<(config: unknown) => void>(), instrumentations: vi.fn(() => []) }));
vi.mock('@grafana/faro-web-sdk', () => ({
  initializeFaro: mocks.initialize,
  getWebInstrumentations: mocks.instrumentations,
}));
vi.mock('@grafana/faro-web-tracing', () => ({ TracingInstrumentation: class {} }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_FARO_COLLECTOR_URL', 'https://collector.grafana.net');
  vi.stubEnv('VITE_FARO_TOKEN', 'synthetic');
  history.replaceState(null, '', '/dashboard');
});

it('drops credentials, signed URLs and sensitive route telemetry before transport', async () => {
  await import('./telemetry');
  const config = mocks.initialize.mock.lastCall![0] as {
    beforeSend: (item: unknown) => unknown;
    ignoreUrls: RegExp[];
  };
  const safe = { payload: { message: 'Network unavailable', traceId: 'abc123' } };
  expect(config.beforeSend(safe)).toEqual(safe);
  for (const payload of [
    { url: 'https://storage.test/file?X-Amz-Signature=private' },
    { url: '/api/v1/auth/google/callback?code=private' },
    { password: 'private' },
    { headers: { cookie: 'private' } },
    { message: 'token=' + 'A'.repeat(43) },
    { message: 'Bearer legacy-secret' },
  ]) {
    expect(config.beforeSend({ payload })).toBeNull();
  }
  history.replaceState(null, '', '/auth/reset-password');
  expect(config.beforeSend(safe)).toBeNull();
  expect(mocks.instrumentations).toHaveBeenCalledWith({ captureConsole: false });
  for (const url of ['/api/v1/session', '/api/v1/profile/password', '/api/v1/auth/csrf']) {
    expect(config.ignoreUrls.some((pattern: RegExp) => pattern.test(url))).toBe(true);
  }
});
