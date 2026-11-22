import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { FormError } from '@/components/form-error'
import { TextField } from '@/components/text-field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { forgotPassword, resetPassword } from '@/lib/api'
import { AuthLayout } from '../components/auth-layout'
import { CODE_LENGTH, CodeField } from '../components/code-field'
import { SubmitButton } from '../components/submit-button'
import { PASSWORD_HINT, RESEND_COOLDOWN_SECONDS } from '../constants'
import { retryAfterSeconds, useCooldown } from '../use-cooldown'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [code, setCode] = useState('')
  const cooldown = useCooldown(searchParams.has('email') ? RESEND_COOLDOWN_SECONDS : 0)

  const resetMutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      toast.success('Password reset. Log in with your new password.')
      navigate('/login', { replace: true })
    },
  })

  const resendMutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: () => {
      cooldown.start(RESEND_COOLDOWN_SECONDS)
      toast.success('If an account exists for that email, we sent a new code')
    },
    onError: (error) => {
      const retryAfter = retryAfterSeconds(error)
      if (retryAfter !== null) {
        cooldown.start(retryAfter)
      }
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    resetMutation.mutate({
      email,
      code,
      password: String(form.get('password')),
      password_confirmation: String(form.get('password_confirmation')),
    })
  }

  const fieldError = (field: string) => resetMutation.error?.fieldError(field)

  return (
    <AuthLayout
      title="Reset Your Password"
      description="Enter the code from your email and choose a new password."
      footer={
        <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to Log In
        </Link>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          {searchParams.has('email') && (
            <Alert>
              <AlertDescription>If an account exists for that email, we've sent a code.</AlertDescription>
            </Alert>
          )}
          <FormError error={resetMutation.error} fields={['email', 'code', 'password']} />
          <FormError error={resendMutation.error} fields={['email']} />
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldError('email') ?? resendMutation.error?.fieldError('email')}
          />
          <CodeField value={code} onChange={setCode} error={fieldError('code')} description="The code expires in 10 minutes." />
          <TextField
            label="New Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            description={PASSWORD_HINT}
            error={fieldError('password')}
          />
          <TextField
            label="Confirm New Password"
            name="password_confirmation"
            type="password"
            autoComplete="new-password"
            required
          />
          <SubmitButton isPending={resetMutation.isPending} disabled={code.length !== CODE_LENGTH}>
            Reset Password
          </SubmitButton>
          <Button
            type="button"
            variant="outline"
            onClick={() => resendMutation.mutate(email)}
            disabled={resendMutation.isPending || cooldown.remaining > 0 || email.trim() === ''}
          >
            {resendMutation.isPending && <Spinner data-icon="inline-start" aria-hidden="true" />}
            {cooldown.remaining > 0 ? `Resend Code in ${cooldown.remaining}s` : 'Resend Code'}
          </Button>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}
