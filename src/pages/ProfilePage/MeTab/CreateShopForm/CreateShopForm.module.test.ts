import { renderHookWithProviders } from '@/test/render';
import { act } from '@testing-library/react';
import type { FormEvent } from 'react';
import { expect, it, vi } from 'vitest';
import { useCreateShopForm } from './CreateShopForm.module';
it('validates names, trims submissions and prevents calls while busy', () => {
  const submit = vi.fn();
  const event = { preventDefault: vi.fn() } as unknown as FormEvent;
  const { result, rerender } = renderHookWithProviders(
    ({ busy }) => useCreateShopForm({ busy, onSubmit: submit }),
    { initialProps: { busy: false } },
  );
  act(() => result.current.handleSubmit(event));
  expect(submit).not.toHaveBeenCalled();
  act(() => result.current.handleFieldChange('name', ' Bakery '));
  act(() => result.current.handleSubmit(event));
  expect(submit).toHaveBeenCalledWith('Bakery');
  submit.mockClear();
  rerender({ busy: true });
  act(() => result.current.handleSubmit(event));
  expect(submit).not.toHaveBeenCalled();
});
