import { ConfirmDialog } from '@/components/confirm-dialog'
import type { AdminUser } from '@/lib/api'
import { useDeactivateUser, useReactivateUser } from '../use-user-actions'

export type StatusAction = 'deactivate' | 'reactivate'

interface UserStatusDialogProps {
  user: AdminUser
  action: StatusAction | null
  onClose: () => void
}

/** Confirmation for deactivating (PRD §6.4, exact copy) or reactivating a user. */
export function UserStatusDialog({ user, action, onClose }: UserStatusDialogProps) {
  const deactivate = useDeactivateUser()
  const reactivate = useReactivateUser()
  const mutation = action === 'reactivate' ? reactivate : deactivate

  function handleOpenChange(open: boolean) {
    if (!open) {
      deactivate.reset()
      reactivate.reset()
      onClose()
    }
  }

  function handleConfirm() {
    mutation.mutate(user, { onSuccess: () => handleOpenChange(false) })
  }

  if (action === 'reactivate') {
    return (
      <ConfirmDialog
        open
        onOpenChange={handleOpenChange}
        title="Reactivate This User?"
        description={
          <p>
            {user.name} will be able to log in to Stockwise again
            {user.email_verified_at ? '.' : ' and will need to verify their email before working in a company.'}
          </p>
        }
        confirmLabel="Reactivate User"
        onConfirm={handleConfirm}
        isPending={mutation.isPending}
        error={mutation.error}
      />
    )
  }

  return (
    <ConfirmDialog
      open={action === 'deactivate'}
      onOpenChange={handleOpenChange}
      title="Deactivate This User?"
      description={
        <>
          <p>This user will no longer be able to log in to Stockwise or access any of their companies.</p>
          <p className="mt-2">Their memberships and historical business records will remain intact.</p>
        </>
      }
      confirmLabel="Deactivate User"
      onConfirm={handleConfirm}
      isPending={mutation.isPending}
      error={mutation.error}
      destructive
    />
  )
}
