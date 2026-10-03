import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';

/**
 * The app's routes, navigation and every sheet close handler need a router, so
 * every component test gets one. The v7 future flags are opted into here to
 * silence the upgrade warnings and to keep the tests exercising the routing
 * semantics the app will run under once v7 lands.
 */
export function renderWithRouter(
  ui: ReactElement,
  { route = '/', ...options }: { route?: string } & RenderOptions = {},
): RenderResult {
  const routerProps: MemoryRouterProps = {
    initialEntries: [route],
    future: { v7_startTransition: true, v7_relativeSplatPath: true },
  };
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter {...routerProps}>{children}</MemoryRouter>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}

/** A `File` with the given type, for upload-path tests. */
export function makeFile(name: string, type: string, bytes = 'x'): File {
  return new File([bytes], name, { type });
}

/** Resolves once every already-queued microtask has run. */
export function flush(): Promise<void> {
  return Promise.resolve().then(() => undefined);
}
