import type { CompanyActivity } from '@/lib/api'

export const COMPANY_ACTIVITY_LABELS: Record<CompanyActivity['action'], string> = {
  'company.created': 'Company Created',
  'company.updated': 'Profile Updated',
  'company.suspended': 'Company Suspended',
  'company.reactivated': 'Company Reactivated',
  'company.ownership_transferred': 'Ownership Transferred',
  'company.member_added': 'Member Added',
  'company.member_role_changed': 'Member Role Changed',
  'company.member_deactivated': 'Member Deactivated',
  'company.member_reactivated': 'Member Reactivated',
  'branch.created': 'Branch Created',
  'branch.updated': 'Branch Updated',
  'branch.deactivated': 'Branch Deactivated',
  'branch.reactivated': 'Branch Reactivated',
  'branch_access.updated': 'Branch Access Changed',
}

/** Labels for edited fields in the activity log. */
export const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  legal_name: 'Legal Name',
  tax_id: 'Tax ID',
  email: 'Email',
  phone: 'Phone',
  address: 'Address',
  timezone: 'Timezone',
  currency: 'Currency',
  role: 'Role',
  type: 'Type',
  branch_access: 'Branch Access',
}
