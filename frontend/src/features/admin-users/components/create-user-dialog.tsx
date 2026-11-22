import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { FormError } from '@/components/form-error'
import { TextField } from '@/components/text-field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { PASSWORD_HINT } from '@/features/auth/constants'
import { useCreateUser } from '../use-user-actions'

/** Create a pending user with an initial password (UM-7, PRD §6.2). */
export function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const mutation = useCreateUser()

  function handleOpenChange(next: boolean) {
    if (mutation.isPending) {
      return
    }
    if (!next) {
      mutation.reset()
    }
    onOpenChange(next)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    mutation.mutate(
      {
        name: String(form.get('name')),
        email: String(form.get('email')),
        password: String(form.get('password')),
        password_confirmation: String(form.get('password_confirmation')),
      },
      {
        onSuccess: (user) => {
          onOpenChange(false)
          mutation.reset()
          navigate(`/admin/users/${user.id}`)
        },
      },
    )
  }

  const fieldError = (field: string) => mutation.error?.fieldError(field)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              The account starts as pending. Share the initial password with the user. They verify their email when they
              first log in, then can change the password.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <FormError error={mutation.error} fields={['name', 'email', 'password']} />
            <TextField label="Full Name" name="name" autoComplete="off" required error={fieldError('name')} />
            <TextField label="Email" name="email" type="email" autoComplete="off" spellCheck={false} required error={fieldError('email')} />
            <TextField
              label="Initial Password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              description={PASSWORD_HINT}
              error={fieldError('password')}
            />
            <TextField label="Confirm Initial Password" name="password_confirmation" type="password" autoComplete="new-password" required />
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />} disabled={mutation.isPending}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner data-icon="inline-start" aria-hidden="true" />}
              Add User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
