import { renderHookWithProviders } from '@/test/render';
import { act } from '@testing-library/react';
import type { FormEvent } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useAuthPage } from './AuthPage.module';
const boundary = vi.hoisted(() => ({ signIn: vi.fn(), signUp: vi.fn(), navigate: vi.fn() }));
vi.mock('@/features/auth/supabase', () => ({
  supabase: { auth: { signInWithPassword: boundary.signIn, signUp: boundary.signUp } },
}));
vi.mock('react-router-dom', async (original) => ({
  ...(await original<typeof import('react-router-dom')>()),
  useNavigate: () => boundary.navigate,
}));
const event = { preventDefault: vi.fn() } as unknown as FormEvent;
beforeEach(() => {
  boundary.signIn.mockReset().mockResolvedValue({ error: null });
  boundary.signUp.mockReset().mockResolvedValue({ data: { session: null }, error: null });
  boundary.navigate.mockReset();
});
it('rejects invalid credentials before calling authentication', async () => {
  const { result } = renderHookWithProviders(() => useAuthPage({ mode: 'signin' }));
  await act(() => result.current.submit(event));
  expect(result.current.error).toBe('Email is required.');
  expect(boundary.signIn).not.toHaveBeenCalled();
});
it('reports failed authentication and resets errors when the route mode changes', async () => {
  boundary.signIn.mockResolvedValue({ error: new Error('Wrong password') });
  const { result, rerender } = renderHookWithProviders(({ mode }) => useAuthPage({ mode }), {
    initialProps: { mode: 'signin' as 'signin' | 'signup' },
  });
  act(() => {
    result.current.handleFieldChange('email', 'testtest@gmail.com');
    result.current.handleFieldChange('password', 'testtest');
  });
  await act(() => result.current.submit(event));
  expect(result.current.error).toBe('Wrong password');
  expect(result.current.busy).toBe(false);
  rerender({ mode: 'signup' });
  expect(result.current.error).toBeNull();
  expect(result.current.isSignIn).toBe(false);
});
it('shows confirmation instructions when signup has no session', async () => {
  const { result } = renderHookWithProviders(() => useAuthPage({ mode: 'signup' }));
  act(() => {
    result.current.handleFieldChange('email', 'testtest@gmail.com');
    result.current.handleFieldChange('password', 'testtest');
    result.current.handleFieldChange('fullName', 'Test User');
  });
  await act(() => result.current.submit(event));
  expect(result.current.notice).toMatch(/Check your inbox/);
  expect(boundary.navigate).not.toHaveBeenCalled();
});
