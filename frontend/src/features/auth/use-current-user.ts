import { useQuery } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { authToken, userQueries } from '@/lib/api'

/** The stored bearer token, re-rendering whenever it changes (login, logout, a 401, another tab). */
export function useAuthToken(): string | null {
  return useSyncExternalStore(authToken.subscribe, authToken.get)
}

/**
 * The logged-in user. Without a stored token the query stays idle and the visitor is a guest.
 * A 401 clears the token (see `onUnauthorized` in main.tsx), which also makes them a guest.
 */
export function useCurrentUser() {
  const hasToken = useAuthToken() !== null
  const query = useQuery({ ...userQueries.current(), enabled: hasToken })
  const isGuest = !hasToken || query.error?.isUnauthorized === true

  return { ...query, isGuest }
}
