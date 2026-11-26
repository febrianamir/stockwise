import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { TextareaField } from '@/components/textarea-field'
import type { AdminCompanyDetail } from '@/lib/api'
import { useReactivateCompany } from '../use-company-actions'

/** Reactivate with an optional note (PRD §6.6). */
export function ReactivateCompanyDialog({ company, open, onClose }: { company: AdminCompanyDetail; open: boolean; onClose: () => void }) {
  const mutation = useReactivateCompany()
  const [note, setNote] = useState('')

  function handleOpenChange(next: boolean) {
    if (!next) {
      mutation.reset()
      setNote('')
      onClose()
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Reactivate This Company?"
      description={<p>Members of {company.name} will regain access on their next request. Nothing else changes.</p>}
      confirmLabel="Reactivate Company"
      onConfirm={() => mutation.mutate({ company, note: note.trim() || null }, { onSuccess: () => handleOpenChange(false) })}
      isPending={mutation.isPending}
      error={mutation.error}
      fields={['note']}
    >
      <TextareaField
        label="Note"
        name="note"
        rows={3}
        maxLength={500}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        description="Recorded in the activity log."
        error={mutation.error?.fieldError('note')}
      />
    </ConfirmDialog>
  )
}
