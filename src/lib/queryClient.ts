import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

/**
 * Shared cache policy for every server read/write in the app.
 *
 * - `staleTime` 60s: tab switches and remounts reuse the cache instead of
 *   hitting the API, while a minute is short enough that background refetches
 *   keep the numbers honest.
 * - `gcTime` 5m: an unmounted list/detail survives long enough to come back
 *   instantly when a user returns to it.
 * - `refetchOnWindowFocus`: regaining focus is the natural "is this still
 *   right?" moment, and the cache makes it free when nothing changed.
 * - A 4xx is a client mistake the retry cannot fix, so only network/5xx errors
 *   get the single retry.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 1;
        },
      },
      mutations: { retry: false },
    },
  });
}
