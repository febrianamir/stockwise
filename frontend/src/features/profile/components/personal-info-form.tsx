import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { FormError } from '@/components/form-error'
import { TextField } from '@/components/text-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { updateProfile, userKeys, type User } from '@/lib/api'

export function PersonalInfoForm({ user }: { user: User }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(userKeys.current(), updatedUser)
      toast.success('Profile updated')
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const phone = String(form.get('phone')).trim()
    mutation.mutate({ name: String(form.get('name')), phone: phone === '' ? null : phone })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Personal information</h2>
        </CardTitle>
        <CardDescription>Your name is shown to your team and on receipts you process.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup className="max-w-md">
            <FormError error={mutation.error} fields={['name', 'phone']} />
            <TextField
              label="Full name"
              name="name"
              autoComplete="name"
              required
              defaultValue={user.name}
              error={mutation.error?.fieldError('name')}
            />
            <TextField
              label="Phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue={user.phone ?? ''}
              placeholder="+62 812 3456 7890"
              error={mutation.error?.fieldError('phone')}
            />
            <div>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Spinner data-icon="inline-start" aria-hidden="true" />}
                Save changes
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
