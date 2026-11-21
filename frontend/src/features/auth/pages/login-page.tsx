import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import type { FormEvent } from 'react'
import { FormError } from '@/components/form-error'
import { TextField } from '@/components/text-field'
import { FieldGroup } from '@/components/ui/field'
import { login } from '@/lib/api'
import { AuthLayout } from '../components/auth-layout'
import { SubmitButton } from '../components/submit-button'
import { startSession } from '../session'

export function LoginPage() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: login,
    // RequireGuest redirects once the session exists.
    onSuccess: (response) => startSession(queryClient, response),
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    mutation.mutate({ email: String(form.get('email')), password: String(form.get('password')) })
  }

  return (
    <AuthLayout
      title="Log in to Stockwise"
      description="Enter your email and password."
      footer={
        <p>
          New to Stockwise?{' '}
          <Link to="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          <FormError error={mutation.error} fields={['email', 'password']} />
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            required
            error={mutation.error?.fieldError('email')}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            error={mutation.error?.fieldError('password')}
            labelAction={
              <Link to="/forgot-password" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Forgot password?
              </Link>
            }
          />
          <SubmitButton isPending={mutation.isPending}>Log in</SubmitButton>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}
