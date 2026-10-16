import { renderHookWithProviders } from '@/test/render';
import { act } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';
it('keeps the previous value until the last change settles and cancels work on unmount', async () => {
  vi.useFakeTimers();
  const { result, rerender, unmount } = renderHookWithProviders(
    ({ value }) => useDebouncedValue(value),
    { initialProps: { value: 'one' } },
  );
  rerender({ value: 'two' });
  await act(() => vi.advanceTimersByTimeAsync(200));
  rerender({ value: 'three' });
  await act(() => vi.advanceTimersByTimeAsync(249));
  expect(result.current).toBe('one');
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(result.current).toBe('three');
  rerender({ value: 'four' });
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
