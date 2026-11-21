import type { QueryClient } from '@tanstack/react-query'
import { authToken, userKeys, type AuthResponse } from '@/lib/api'

/** Store the token from register/login and seed the current-user cache. */
export function startSession(queryClient: QueryClient, { token, data }: AuthResponse): void {
  authToken.set(token)
  queryClient.setQueryData(userKeys.current(), data)
}

/** Forget the token and every cached response, so no data survives into the next session. */
export function endSession(queryClient: QueryClient): void {
  authToken.set(null)
  queryClient.clear()
}
