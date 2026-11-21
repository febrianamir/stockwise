import { useMutation } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { FormError } from '@/components/form-error'
import { TextField } from '@/components/text-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { PASSWORD_HINT } from '@/features/auth/constants'
import { updatePassword } from '@/lib/api'

export function ChangePasswordForm({ email }: { email: string }) {
  const mutation = useMutation({ mutationFn: updatePassword })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    mutation.mutate(
      {
        current_password: String(form.get('current_password')),
        password: String(form.get('password')),
        password_confirmation: String(form.get('password_confirmation')),
      },
      {
        onSuccess: () => {
          formElement.reset()
          toast.success('Password changed. Other devices have been logged out.')
        },
      },
    )
  }

  const fieldError = (field: string) => mutation.error?.fieldError(field)

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Change password</h2>
        </CardTitle>
        <CardDescription>Changing your password logs you out on every other device.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate>
          {/* Lets password managers know which account this password belongs to. */}
          <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
          <FieldGroup className="max-w-md">
            <FormError error={mutation.error} fields={['current_password', 'password']} />
            <TextField
              label="Current password"
              name="current_password"
              type="password"
              autoComplete="current-password"
              required
              error={fieldError('current_password')}
            />
            <TextField
              label="New password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              description={PASSWORD_HINT}
              error={fieldError('password')}
            />
            <TextField
              label="Confirm new password"
              name="password_confirmation"
              type="password"
              autoComplete="new-password"
              required
            />
            <div>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Spinner data-icon="inline-start" aria-hidden="true" />}
                Change password
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
