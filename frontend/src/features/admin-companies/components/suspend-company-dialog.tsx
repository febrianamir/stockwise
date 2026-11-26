import { useId, useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { TextareaField } from '@/components/textarea-field'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { AdminCompanyDetail } from '@/lib/api'
import { useSuspendCompany } from '../use-company-actions'

const REASON_MIN = 10
const REASON_MAX = 500

/** Suspend with a required reason and type-the-code confirmation (PRD §6.5). */
export function SuspendCompanyDialog({ company, open, onClose }: { company: AdminCompanyDetail; open: boolean; onClose: () => void }) {
  const mutation = useSuspendCompany()
  const confirmId = useId()
  const [reason, setReason] = useState('')
  const [typedCode, setTypedCode] = useState('')
  const reasonLength = reason.trim().length
  const canSubmit = reasonLength >= REASON_MIN && reasonLength <= REASON_MAX && typedCode.trim() === company.code

  function handleOpenChange(next: boolean) {
    if (!next) {
      mutation.reset()
      setReason('')
      setTypedCode('')
      onClose()
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Suspend This Company?"
      description={
        <p>
          Members of {company.name}, including the owner, will immediately lose access to this company. Their accounts stay active and
          they can keep using other companies. No data is changed, and you can reactivate the company at any time.
        </p>
      }
      confirmLabel="Suspend Company"
      onConfirm={() => mutation.mutate({ company, reason: reason.trim() }, { onSuccess: () => handleOpenChange(false) })}
      isPending={mutation.isPending}
      error={mutation.error}
      fields={['reason']}
      confirmDisabled={!canSubmit}
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
        description={`Recorded in the activity log. ${REASON_MIN}–${REASON_MAX} characters.`}
        error={mutation.error?.fieldError('reason')}
      />
      <Field>
        <FieldLabel htmlFor={confirmId}>
          Type <span className="font-mono font-semibold">{company.code}</span> to Confirm
        </FieldLabel>
        <Input
          id={confirmId}
          value={typedCode}
          onChange={(event) => setTypedCode(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-describedby={`${confirmId}-hint`}
        />
        <FieldDescription id={`${confirmId}-hint`}>This prevents suspending the wrong company.</FieldDescription>
        {typedCode !== '' && typedCode.trim() !== company.code && <FieldError>The code doesn't match.</FieldError>}
      </Field>
    </ConfirmDialog>
  )
}
