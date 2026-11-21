import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import type { FormEvent } from 'react'
import { FormError } from '@/components/form-error'
import { TextField } from '@/components/text-field'
import { FieldGroup } from '@/components/ui/field'
import { register } from '@/lib/api'
import { AuthLayout } from '../components/auth-layout'
import { SubmitButton } from '../components/submit-button'
import { PASSWORD_HINT } from '../constants'
import { startSession } from '../session'

export function RegisterPage() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: register,
    // RequireGuest sends the new, unverified user to /verify-email.
    onSuccess: (response) => startSession(queryClient, response),
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    mutation.mutate({
      name: String(form.get('name')),
      email: String(form.get('email')),
      password: String(form.get('password')),
      password_confirmation: String(form.get('password_confirmation')),
    })
  }

  const fieldError = (field: string) => mutation.error?.fieldError(field)

  return (
    <AuthLayout
      title="Create your account"
      description="Start managing your stores with Stockwise."
      footer={
        <p>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          <FormError error={mutation.error} fields={['name', 'email', 'password']} />
          <TextField label="Full name" name="name" autoComplete="name" required error={fieldError('name')} />
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            required
            error={fieldError('email')}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            description={PASSWORD_HINT}
            error={fieldError('password')}
          />
          <TextField
            label="Confirm password"
            name="password_confirmation"
            type="password"
            autoComplete="new-password"
            required
          />
          <SubmitButton isPending={mutation.isPending}>Create account</SubmitButton>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}
