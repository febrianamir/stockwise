import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import type { FormEvent } from 'react'
import { FormError } from '@/components/form-error'
import { TextField } from '@/components/text-field'
import { FieldGroup } from '@/components/ui/field'
import { forgotPassword } from '@/lib/api'
import { AuthLayout } from '../components/auth-layout'
import { SubmitButton } from '../components/submit-button'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: (_response, email) => navigate(`/reset-password?${new URLSearchParams({ email })}`),
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate(String(new FormData(event.currentTarget).get('email')))
  }

  return (
    <AuthLayout
      title="Forgot Your Password?"
      description="Enter your email and we'll send you a code to reset it."
      footer={
        <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to Log In
        </Link>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          <FormError error={mutation.error} fields={['email']} />
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            required
            error={mutation.error?.fieldError('email')}
          />
          <SubmitButton isPending={mutation.isPending}>Send Code</SubmitButton>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}
