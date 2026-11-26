import { useState, type FormEvent } from 'react'
import { FormError } from '@/components/form-error'
import { TextField } from '@/components/text-field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import type { AddMemberInput } from '@/lib/api'
import { useAddMember } from '../use-company-actions'
import { ASSIGNABLE_ROLES } from '../roles'

/** Add an existing active user by email with a role (CW-3). */
export function AddMemberDialog({ companyId, open, onOpenChange }: { companyId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const mutation = useAddMember(companyId)
  const [role, setRole] = useState<AddMemberInput['role']>('cashier')

  function handleOpenChange(next: boolean) {
    if (mutation.isPending) {
      return
    }
    if (!next) {
      mutation.reset()
      setRole('cashier')
    }
    onOpenChange(next)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim()
    mutation.mutate({ email, role }, { onSuccess: () => handleOpenChange(false) })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>Add someone who already has an active Stockwise account. They get access right away.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <FormError error={mutation.error} fields={['email', 'role']} />
            <TextField
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="off"
              spellCheck={false}
              placeholder="name@example.com"
              error={mutation.error?.fieldError('email')}
            />
            <Field data-invalid={mutation.error?.fieldError('role') ? true : undefined}>
              <FieldLabel>Role</FieldLabel>
              <Select items={ASSIGNABLE_ROLES} value={role} onValueChange={(value) => setRole(value as AddMemberInput['role'])}>
                <SelectTrigger aria-label="Role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>{ASSIGNABLE_ROLES.find((item) => item.value === role)?.description}</FieldDescription>
              {mutation.error?.fieldError('role') && <FieldError>{mutation.error.fieldError('role')}</FieldError>}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />} disabled={mutation.isPending}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner data-icon="inline-start" aria-hidden="true" />}
              Add Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
