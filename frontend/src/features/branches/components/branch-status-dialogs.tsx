import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { TextareaField } from '@/components/textarea-field'
import type { Branch } from '@/lib/api'
import { useDeactivateBranch, useReactivateBranch } from '../use-branch-actions'

const REASON_MIN = 10
const REASON_MAX = 500

interface BranchDialogProps {
  companyId: string
  branch: Branch
  open: boolean
  onClose: () => void
}

/** Deactivate with a required reason (BR-4, BM-6). Access grants are kept. */
export function DeactivateBranchDialog({ companyId, branch, open, onClose }: BranchDialogProps) {
  const mutation = useDeactivateBranch(companyId)
  const [reason, setReason] = useState('')
  const reasonLength = reason.trim().length

  function handleOpenChange(next: boolean) {
    if (!next) {
      mutation.reset()
      setReason('')
      onClose()
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Deactivate This Branch?"
      description={
        <p>
          {branch.name} will stop accepting sales and stock changes. Its history stays readable, members keep their access, and you can
          reactivate it at any time.
        </p>
      }
      confirmLabel="Deactivate Branch"
      onConfirm={() => mutation.mutate({ branch, reason: reason.trim() }, { onSuccess: () => handleOpenChange(false) })}
      isPending={mutation.isPending}
      error={mutation.error}
      fields={['reason']}
      confirmDisabled={reasonLength < REASON_MIN || reasonLength > REASON_MAX}
      destructive
    >
      <TextareaField
        label="Reason"
        name="reason"
        required
        rows={3}
        maxLength={REASON_MAX}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        description={`Shown on the branch and recorded in the activity log. ${REASON_MIN}–${REASON_MAX} characters.`}
        error={mutation.error?.fieldError('reason')}
      />
    </ConfirmDialog>
  )
}

export function ReactivateBranchDialog({ companyId, branch, open, onClose }: BranchDialogProps) {
  const mutation = useReactivateBranch(companyId)

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
      title="Reactivate This Branch?"
      description={<p>{branch.name} will accept sales and stock changes again, with the same member access as before.</p>}
      confirmLabel="Reactivate Branch"
      onConfirm={() => mutation.mutate(branch, { onSuccess: () => handleOpenChange(false) })}
      isPending={mutation.isPending}
      error={mutation.error}
    />
  )
}
