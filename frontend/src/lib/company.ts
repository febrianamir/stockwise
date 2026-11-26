import type { CompanyStatus, MembershipRole, MembershipStatus } from '@/lib/api'

/** Labels shared by the platform and workspace company screens. */

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
}

export const ROLE_LABELS: Record<MembershipRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  cashier: 'Cashier',
}

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

/** "an Admin", "a Manager" */
export function withArticle(role: MembershipRole): string {
  const label = ROLE_LABELS[role]
  return /^[AEIOU]/.test(label) ? `an ${label}` : `a ${label}`
}
