/** Preserve small JSON diagnostics; malformed/oversized details remain an ordinary API error. */
export function boundedErrorDetails(details: unknown): unknown {
  let remaining = 2000;
  function valid(value: unknown, depth: number): boolean {
    remaining--;
    if (remaining < 0 || depth > 5) return false;
    if (value === null || typeof value === 'boolean') return true;
    if (typeof value === 'string') return value.length <= 512;
    if (typeof value === 'number') return Number.isFinite(value);
    if (Array.isArray(value)) {
      return value.length <= 100 && value.every(entry => valid(entry, depth + 1));
    }
    if (typeof value !== 'object' || value === null) return false;
    const entries = Object.entries(value);
    return entries.length <= 20 && entries.every(([key, entry]) => key.length <= 64 && valid(entry, depth + 1));
  }
  return valid(details, 0) ? details : undefined;
}
