import { Ban, CircleCheck, Crown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { CompanyStatus, MembershipStatus } from '@/lib/api'
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
