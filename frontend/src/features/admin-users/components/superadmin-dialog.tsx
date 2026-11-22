import { ConfirmDialog } from '@/components/confirm-dialog'
import type { AdminUser } from '@/lib/api'
import { useSetSuperadmin } from '../use-user-actions'

interface SuperadminDialogProps {
  user: AdminUser
  open: boolean
  onClose: () => void
}

/** Grant or revoke the platform Superadmin flag (PRD §6.6). */
export function SuperadminDialog({ user, open, onClose }: SuperadminDialogProps) {
  const mutation = useSetSuperadmin()
  const granting = !user.is_superadmin

  function handleOpenChange(next: boolean) {
    if (!next) {
      mutation.reset()
      onClose()
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={granting ? 'Make This User a Superadmin?' : 'Remove Superadmin Access?'}
      description={
        granting ? (
          <p>
            {user.name} will be able to manage every user on the Stockwise platform, including deactivating accounts
            and granting Superadmin to others.
          </p>
        ) : (
          <p>{user.name} will lose access to platform administration. Their account and company memberships stay unchanged.</p>
        )
      }
      confirmLabel={granting ? 'Make Superadmin' : 'Remove Superadmin'}
      onConfirm={() => mutation.mutate({ user, isSuperadmin: granting }, { onSuccess: () => handleOpenChange(false) })}
      isPending={mutation.isPending}
      error={mutation.error}
      destructive={!granting}
    />
  )
}
