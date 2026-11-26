import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useId, useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { TextareaField } from '@/components/textarea-field'
import { UserAvatar } from '@/components/user-avatar'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { adminCompanyQueries, type AdminCompanyDetail, type CompanyMember } from '@/lib/api'
import { ROLE_LABELS } from '@/lib/company'
import { useTransferOwnership } from '../use-company-actions'

const REASON_MIN = 10

/**
 * Transfer ownership to an active member with an active account (PRD §6.7, CM-13). The picker
 * searches every eligible member on the server, not just the first page.
 */
export function TransferOwnershipDialog({ company, open, onClose }: { company: AdminCompanyDetail; open: boolean; onClose: () => void }) {
  const id = useId()
  const mutation = useTransferOwnership()
  const [input, setInput] = useState('')
  const search = useDeferredValue(input.trim())
  const [member, setMember] = useState<CompanyMember | null>(null)
  const [reason, setReason] = useState('')
  const { data, isFetching } = useQuery({
    ...adminCompanyQueries.members(company.id, { search: search || undefined, eligible_owner: true }),
    enabled: open,
  })
  const candidates = data?.data ?? []
  const noneEligible = !isFetching && !search && candidates.length === 0

  function handleOpenChange(next: boolean) {
    if (!next) {
      mutation.reset()
      setMember(null)
      setInput('')
      setReason('')
      onClose()
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Transfer Ownership?"
      description={
        <p>
          The new owner gets full access to {company.name}. {company.owner ? `${company.owner.name} becomes an Admin.` : ''}
        </p>
      }
      confirmLabel="Transfer Ownership"
      onConfirm={() =>
        member && mutation.mutate({ company, userId: member.user.id, reason: reason.trim() }, { onSuccess: () => handleOpenChange(false) })
      }
      isPending={mutation.isPending}
      error={mutation.error}
      fields={['user_id', 'reason']}
      confirmDisabled={member === null || reason.trim().length < REASON_MIN}
    >
      <Field data-invalid={mutation.error?.fieldError('user_id') ? true : undefined}>
        <FieldLabel htmlFor={id}>New Owner</FieldLabel>
        {noneEligible ? (
          <FieldDescription>
            No eligible members. The new owner must be an active member of this company with an active account. Owners and Admins add
            members from the company workspace.
          </FieldDescription>
        ) : (
          <Combobox
            items={candidates}
            value={member}
            onValueChange={(next) => setMember((next as CompanyMember | null) ?? null)}
            onInputValueChange={setInput}
            itemToStringLabel={(item: CompanyMember) => item.user.name}
            isItemEqualToValue={(a: CompanyMember, b: CompanyMember) => a.id === b.id}
            filter={null}
          >
            <ComboboxInput id={id} placeholder="Search members by name or email…" />
            <ComboboxContent>
              <ComboboxEmpty>{isFetching ? 'Searching…' : 'No eligible members match.'}</ComboboxEmpty>
              <ComboboxList>
                {(item: CompanyMember) => (
                  <ComboboxItem key={item.id} value={item}>
                    <UserAvatar name={item.user.name} size="sm" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">
                        {item.user.name} <span className="text-muted-foreground">({ROLE_LABELS[item.role]})</span>
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{item.user.email}</span>
                    </span>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        )}
        {mutation.error?.fieldError('user_id') && <FieldError>{mutation.error.fieldError('user_id')}</FieldError>}
      </Field>
      <TextareaField
        label="Reason"
        name="reason"
        required
        rows={3}
        maxLength={500}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        description="Recorded in the activity log. At least 10 characters."
        error={mutation.error?.fieldError('reason')}
      />
    </ConfirmDialog>
  )
}
