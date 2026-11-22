import { Ban, CircleAlert, CircleCheck, Clock, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { UserStatus } from '@/lib/api'
import { STATUS_LABELS } from '../format'

/** Account status: Active = success, Pending = warning, Inactive = destructive (design-system §11). */
export function UserStatusBadge({ status }: { status: UserStatus }) {
  const variant = status === 'active' ? 'success' : status === 'pending' ? 'warning' : 'destructive'
  const Icon = status === 'active' ? CircleCheck : status === 'pending' ? Clock : Ban

  return (
    <Badge variant={variant}>
      <Icon data-icon="inline-start" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </Badge>
  )
}

export function VerificationBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge variant="success">
      <CircleCheck data-icon="inline-start" aria-hidden="true" />
      Verified
    </Badge>
  ) : (
    <Badge variant="warning">
      <CircleAlert data-icon="inline-start" aria-hidden="true" />
      Unverified
    </Badge>
  )
}

export function SuperadminBadge() {
  return (
    <Badge variant="info">
      <ShieldCheck data-icon="inline-start" aria-hidden="true" />
      Superadmin
    </Badge>
  )
}
