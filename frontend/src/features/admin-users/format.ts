import type { AdminUserActivity, UserStatus } from '@/lib/api'

export const STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  inactive: 'Inactive',
}

export const ACTIVITY_LABELS: Record<AdminUserActivity['action'], string> = {
  'user.registered': 'Registered an Account',
  'user.created': 'Account Created by a Superadmin',
  'user.email_verified': 'Email Verified',
  'user.deactivated': 'Account Deactivated',
  'user.reactivated': 'Account Reactivated',
  'user.superadmin_granted': 'Superadmin Granted',
  'user.superadmin_revoked': 'Superadmin Revoked',
  'user.last_login': 'Last Successful Login',
}
