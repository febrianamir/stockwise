import { QueryClient } from '@tanstack/react-query'
import { ApiError, isApiError } from '@/lib/api'

declare module '@tanstack/react-query' {
  interface Register {
    /** Every query/mutation error is normalised to ApiError by the API client. */
    defaultError: ApiError
  }
}

const MAX_RETRIES = 2

/**
 * Retry network failures (status 0) and server errors (5xx) a couple of times.
 * Never retry client errors (4xx): a 401/403/404/422 won't fix itself.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) {
    return false
  }

  return failureCount < MAX_RETRIES
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export const queryClient = createQueryClient()
