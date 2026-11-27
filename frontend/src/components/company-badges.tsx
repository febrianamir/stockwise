import { Ban, CircleCheck, Crown, Store, Warehouse } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { BranchStatus, BranchType, CompanyStatus, MembershipStatus } from '@/lib/api'
import { BRANCH_STATUS_LABELS, BRANCH_TYPE_LABELS } from '@/lib/branch'
import { COMPANY_STATUS_LABELS, MEMBERSHIP_STATUS_LABELS } from '@/lib/company'

/** Company status: Active = success, Suspended = destructive (design-system §11). */
export function CompanyStatusBadge({ status }: { status: CompanyStatus }) {
  const Icon = status === 'active' ? CircleCheck : Ban

  return (
    <Badge variant={status === 'active' ? 'success' : 'destructive'}>
      <Icon data-icon="inline-start" aria-hidden="true" />
      {COMPANY_STATUS_LABELS[status]}
    </Badge>
  )
}

/** Membership status: Active = success, Inactive = destructive (design-system §11). */
export function MembershipStatusBadge({ status }: { status: MembershipStatus }) {
  const Icon = status === 'active' ? CircleCheck : Ban

  return (
    <Badge variant={status === 'active' ? 'success' : 'destructive'}>
      <Icon data-icon="inline-start" aria-hidden="true" />
      {MEMBERSHIP_STATUS_LABELS[status]}
    </Badge>
  )
}

export function OwnerBadge() {
  return (
    <Badge variant="info">
      <Crown data-icon="inline-start" aria-hidden="true" />
      Owner
    </Badge>
  )
}

/** Branch status: Active = success, Inactive = destructive (design-system §11). */
export function BranchStatusBadge({ status }: { status: BranchStatus }) {
  const Icon = status === 'active' ? CircleCheck : Ban

  return (
    <Badge variant={status === 'active' ? 'success' : 'destructive'}>
      <Icon data-icon="inline-start" aria-hidden="true" />
      {BRANCH_STATUS_LABELS[status]}
    </Badge>
  )
}

/** Branch type: a neutral label, not a status. */
export function BranchTypeBadge({ type }: { type: BranchType }) {
  const Icon = type === 'warehouse' ? Warehouse : Store

  return (
    <Badge variant="outline">
      <Icon data-icon="inline-start" aria-hidden="true" />
      {BRANCH_TYPE_LABELS[type]}
    </Badge>
  )
}
