import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';

/**
 * The app's routes, navigation and every sheet close handler need a router, so
 * every component test gets one. The v7 future flags are opted into here to
 * silence the upgrade warnings and to keep the tests exercising the routing
 * semantics the app will run under once v7 lands.
 *
 * Each render gets a *fresh* QueryClient with retries and garbage collection
 * off: retries would make a deliberately failing mock wait, and a shared cache
 * would let one test's data leak into the next.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithRouter(
  ui: ReactElement,
  {
    route = '/',
    queryClient,
    initialEntries,
    initialIndex,
    ...options
  }: {
    route?: string;
    queryClient?: QueryClient;
    initialEntries?: string[];
    initialIndex?: number;
  } & RenderOptions = {},
): RenderResult {
  const routerProps: MemoryRouterProps = {
    initialEntries: initialEntries ?? [route],
    initialIndex,
    future: { v7_startTransition: true, v7_relativeSplatPath: true },
  };
  const client = queryClient ?? createTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter {...routerProps}>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}

export function renderHookWithProviders<T, P>(
  hook: (props: P) => T,
  {
    route = '/',
    queryClient = createTestQueryClient(),
    initialProps,
  }: { route?: string; queryClient?: QueryClient; initialProps?: P } = {},
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[route]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { ...renderHook(hook, { wrapper, initialProps }), queryClient };
}

/** A `File` with the given type, for upload-path tests. */
export function makeFile(name: string, type: string, bytes = 'x'): File {
  return new File([bytes], name, { type });
}

/** Resolves once every already-queued microtask has run. */
export function flush(): Promise<void> {
  return Promise.resolve().then(() => undefined);
}
