import { Outlet } from 'react-router'
import { NotFoundPage } from '@/features/not-found-page'
import { canAdministerPlatform } from '@/features/auth/permissions'
import { useCurrentUser } from '@/features/auth/use-current-user'

/**
 * Platform administration pages (UM-1). Everyone else sees the not-found page; the API enforces
 * the same rule with 403, so this guard is only for usability (SEC-2).
 */
export function RequireSuperadmin() {
  const { data: user } = useCurrentUser()

  if (!canAdministerPlatform(user)) {
    return <NotFoundPage embedded />
  }

  return <Outlet />
}
