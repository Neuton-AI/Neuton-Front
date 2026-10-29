import { expect, it } from 'vitest';
import { mergeDraft } from './merge';
it('merges independent edits to rows with stable identities without matching array positions', () => {
  const base = {
    rows: [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ],
  };
  const local = {
    rows: [
      { id: 'a', name: 'Mine' },
      { id: 'b', name: 'B' },
    ],
  };
  const remote = {
    rows: [
      { id: 'b', name: 'Theirs' },
      { id: 'a', name: 'A' },
    ],
  };
  expect(mergeDraft(base, local, remote)).toEqual({
    data: {
      rows: [
        { id: 'b', name: 'Theirs' },
        { id: 'a', name: 'Mine' },
      ],
    },
    conflicts: [],
  });
});
it('adopts untouched fields while preserving and identifying competing edits', () => {
  const result = mergeDraft(
    { name: 'a', status: 'pending', price: 1 },
    { name: 'mine', status: 'pending', price: 2 },
    { name: 'theirs', status: 'unverified', price: 2 },
  );
  expect(result.data).toEqual({ name: 'mine', status: 'unverified', price: 2 });
  expect(result.conflicts).toEqual(['name']);
});
it('treats collections as a unit and distinguishes null from missing', () => {
  const result = mergeDraft(
    { rows: [1], value: null },
    { rows: [2] },
    { rows: [3], value: 'new' },
  );
  expect(result.conflicts).toEqual(['rows', 'value']);
  expect(result.data).toEqual({ rows: [2] });
});
