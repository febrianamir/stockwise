import type { Company, CompanyPermission } from '@/lib/api'

/**
 * Whether the viewer holds a company permission, from the API's `membership.permissions`
 * (docs/features/company-workspace/prd.md §3). Only for showing actions; the API enforces it (SEC-2).
 */
export function canInCompany(company: Pick<Company, 'membership'> | undefined, permission: CompanyPermission): boolean {
  return company?.membership.permissions.includes(permission) ?? false
}
