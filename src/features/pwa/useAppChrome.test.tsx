import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { useAppChrome } from './useAppChrome';

afterEach(() => {
  document.querySelector('meta[name="theme-color"]')?.remove();
});

describe('app chrome', () => {
  it('follows Capture entry, background return and exit, then restores document hints', () => {
    const theme = document.createElement('meta');
    theme.name = 'theme-color';
    theme.content = '#FAF9F5';
    document.head.append(theme);
    const { result, unmount } = renderHook(() => {
      useAppChrome();
      return useNavigate();
    }, {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={['/dashboard']}>{children}</MemoryRouter>
      ),
    });

    expect(theme.content).toBe('#FAF9F5');
    act(() => result.current('/capture?source=camera'));
    expect(theme.content).toBe('#181715');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(document.documentElement.style.getPropertyValue('--app-background')).toBe('#181715');

    theme.content = '#FFFFFF';
    act(() => window.dispatchEvent(new Event('pageshow')));
    expect(theme.content).toBe('#181715');
    theme.content = '#FFFFFF';
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(theme.content).toBe('#181715');

    act(() => result.current('/catalog'));
    expect(theme.content).toBe('#FAF9F5');
    expect(document.documentElement.style.colorScheme).toBe('light');
    unmount();
    expect(document.documentElement.style.getPropertyValue('--app-background')).toBe('');
    expect(document.documentElement.style.colorScheme).toBe('');
  });
});
