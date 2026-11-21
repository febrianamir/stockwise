import { Navigate, Outlet, useLocation, type Location } from 'react-router'
import { PageError, PageLoading } from '@/components/page-status'
import { useCurrentUser } from '../use-current-user'

interface FromState {
  from?: Location
}

/** Logged-in routes. Guests go to /login and come back afterwards (PRD §8). */
export function RequireAuth() {
  const { data: user, error, isGuest, refetch, isFetching } = useCurrentUser()
  const location = useLocation()

  if (isGuest) {
    return <Navigate to="/login" replace state={{ from: location } satisfies FromState} />
  }

  if (user) {
    return <Outlet />
  }

  if (error) {
    return <PageError message={error.message} onRetry={() => refetch()} isRetrying={isFetching} />
  }

  return <PageLoading />
}

/**
 * Guest-only routes (login, register, password recovery). Once a session exists, for example
 * right after login, unverified users go to /verify-email and verified users go back to where
 * they came from, or /profile.
 */
export function RequireGuest() {
  const { data: user, isGuest } = useCurrentUser()
  const location = useLocation()

  if (isGuest) {
    return <Outlet />
  }

  if (user) {
    const from = (location.state as FromState | null)?.from
    const destination = user.email_verified_at ? (from ? `${from.pathname}${from.search}` : '/profile') : '/verify-email'

    return <Navigate to={destination} replace />
  }

  return <PageLoading />
}
