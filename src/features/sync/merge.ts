function equal(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = Object.keys(a),
    right = Object.keys(b);
  return (
    left.length === right.length &&
    left.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(b, key) &&
        equal(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        ),
    )
  );
}
const owns = (value: object, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);
function mergeRows(base: unknown[], local: unknown[], incoming: unknown[]) {
  const rows = [...base, ...local, ...incoming];
  const identity = (row: unknown): string | undefined => {
    if (!row || typeof row !== 'object') return;
    const value = row as Record<string, unknown>;
    return typeof value.id === 'string'
      ? value.id
      : typeof value.key === 'string'
        ? value.key
        : undefined;
  };
  if (!rows.every((row) => identity(row) !== undefined)) return;
  const index = (values: unknown[]) =>
    new Map(values.map((row) => [identity(row)!, row]));
  const b = index(base),
    l = index(local),
    r = index(incoming);
  if (
    b.size !== base.length ||
    l.size !== local.length ||
    r.size !== incoming.length
  )
    return;
  const data: unknown[] = [];
  let conflict = false;
  for (const id of new Set([...r.keys(), ...l.keys(), ...b.keys()])) {
    const previous = b.get(id),
      own = l.get(id),
      remote = r.get(id);
    if (equal(own, previous)) {
      if (remote !== undefined) data.push(remote);
      continue;
    }
    if (equal(remote, previous) || equal(own, remote)) {
      if (own !== undefined) data.push(own);
      continue;
    }
    if (own === undefined || remote === undefined) {
      conflict = true;
      if (own !== undefined) data.push(own);
      continue;
    }
    const merged = mergeDraft(
      (previous ?? {}) as object,
      own as object,
      remote as object,
    );
    conflict ||= merged.conflicts.length > 0;
    data.push(merged.data);
  }
  return { data, conflict };
}
/** Three-way merge; collections are conflict units, never aligned by array index. */
export function mergeDraft<T extends object>(
  base: T,
  local: T,
  incoming: T,
): { data: T; conflicts: string[] } {
  const data = { ...incoming } as Record<string, unknown>;
  const conflicts: string[] = [];
  for (const key of new Set([
    ...Object.keys(base),
    ...Object.keys(local),
    ...Object.keys(incoming),
  ])) {
    const b = (base as Record<string, unknown>)[key];
    const l = (local as Record<string, unknown>)[key];
    const r = (incoming as Record<string, unknown>)[key];
    const same = (x: object, y: object, xv: unknown, yv: unknown) =>
      owns(x, key) === owns(y, key) && equal(xv, yv);
    if (same(base, local, b, l)) continue;
    if (Array.isArray(b) && Array.isArray(l) && Array.isArray(r)) {
      const merged = mergeRows(b, l, r);
      if (merged) {
        data[key] = merged.data;
        if (merged.conflict) conflicts.push(key);
        continue;
      }
    }
    if (!same(base, incoming, b, r) && !same(local, incoming, l, r))
      conflicts.push(key);
    if (owns(local, key)) data[key] = l;
    else delete data[key];
  }
  return { data: data as T, conflicts };
}
