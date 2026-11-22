import type { User } from '@/lib/api'

/**
 * Central permission checks for the UI (ui-guidelines §10). They only decide what to show:
 * the backend enforces the same rules (SEC-2).
 */

/** Mirrors the backend `administer-platform` gate: an active, verified Superadmin (UM-1). */
export function canAdministerPlatform(user: User | undefined): boolean {
  return user !== undefined && user.is_superadmin && user.status === 'active' && user.email_verified_at !== null
}
