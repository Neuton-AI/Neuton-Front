import type { DocumentData } from './types';

/** Keep the original command shape while adopting the safely merged field values. */
export function rebaseBody(body: unknown, data: DocumentData) {
  const rebased = { ...((body as Record<string, unknown>) ?? {}) };
  for (const field of Object.keys(rebased)) {
    if (!(field in data)) continue;
    const value = data[field];
    rebased[field] =
      typeof rebased[field] === 'number' &&
      typeof value === 'string' &&
      Number.isFinite(Number(value))
        ? Number(value)
        : value;
  }
  return rebased;
}
