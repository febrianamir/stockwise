import { parseISO } from 'date-fns'
import type { AdminUserActivity, UserStatus } from '@/lib/api'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const numberFormat = new Intl.NumberFormat()

export function formatDate(value: string | null): string {
  return value ? dateFormat.format(new Date(value)) : '—'
}

/** A `YYYY-MM-DD` calendar day, read as a local date (not UTC midnight, which can show the day before). */
export function formatDay(value: string): string {
  return dateFormat.format(parseISO(value))
}

export function formatDateTime(value: string | null): string {
  return value ? dateTimeFormat.format(new Date(value)) : '—'
}

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

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
