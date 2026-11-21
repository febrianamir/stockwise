import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { FormError } from '@/components/form-error'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { resendVerificationCode, userKeys, verifyEmail } from '@/lib/api'
import { AuthLayout } from '../components/auth-layout'
import { CODE_LENGTH, CodeField } from '../components/code-field'
import { SubmitButton } from '../components/submit-button'
import { RESEND_COOLDOWN_SECONDS } from '../constants'
import { retryAfterSeconds, useCooldown } from '../use-cooldown'
import { useCurrentUser } from '../use-current-user'
import { useLogout } from '../use-logout'

export function VerifyEmailPage() {
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()
  const [code, setCode] = useState('')
  const cooldown = useCooldown()
  const logoutMutation = useLogout()

  const verifyMutation = useMutation({
    mutationFn: verifyEmail,
    onSuccess: (verifiedUser) => {
      queryClient.setQueryData(userKeys.current(), verifiedUser)
      toast.success('Email verified')
    },
  })

  const resendMutation = useMutation({
    mutationFn: resendVerificationCode,
    onSuccess: () => {
      cooldown.start(RESEND_COOLDOWN_SECONDS)
      setCode('')
      verifyMutation.reset()
      toast.success('We sent a new code to your email')
    },
    onError: (error) => {
      const retryAfter = retryAfterSeconds(error)
      if (retryAfter !== null) {
        cooldown.start(retryAfter)
      }
    },
  })

  // RequireAuth guarantees a user; verified users have nothing to do here.
  if (!user || user.email_verified_at) {
    return <Navigate to="/profile" replace />
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    verifyMutation.mutate(code)
  }

  return (
    <AuthLayout
      title="Verify your email"
      description={
        <>
          Enter the 6-digit code we sent to <span className="font-medium text-foreground">{user.email}</span>.
        </>
      }
      footer={
        <p>
          Wrong account?{' '}
          <Button
            variant="link"
            className="h-auto p-0"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            Log out
          </Button>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          <FormError error={verifyMutation.error} fields={['code']} />
          <FormError error={resendMutation.error} />
          <CodeField
            value={code}
            onChange={setCode}
            error={verifyMutation.error?.fieldError('code')}
            description="The code expires in 10 minutes."
          />
          <SubmitButton isPending={verifyMutation.isPending} disabled={code.length !== CODE_LENGTH}>
            Verify email
          </SubmitButton>
          <Button
            type="button"
            variant="outline"
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending || cooldown.remaining > 0}
          >
            {resendMutation.isPending && <Spinner data-icon="inline-start" aria-hidden="true" />}
            {cooldown.remaining > 0 ? `Resend code in ${cooldown.remaining}s` : 'Resend code'}
          </Button>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}
