import { CircleAlert, CircleCheck } from 'lucide-react'
import { Link } from 'react-router'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrentUser } from '@/features/auth/use-current-user'
import { MyCompaniesList } from '@/features/companies/components/my-companies-list'
import { ChangePasswordForm } from '../components/change-password-form'
import { PersonalInfoForm } from '../components/personal-info-form'

const memberSinceFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' })

export function ProfilePage() {
  // RequireAuth renders this page only once the user is loaded.
  const { data: user } = useCurrentUser()

  if (!user) {
    return null
  }

  const isVerified = user.email_verified_at !== null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal information and password.</p>
      </div>

      {!isVerified && (
        <Alert>
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Verify Your Email</AlertTitle>
          <AlertDescription>You need a verified email before you can work in a company.</AlertDescription>
          <AlertAction>
            <Button size="sm" render={<Link to="/verify-email" />} nativeButton={false}>
              Verify Email
            </Button>
          </AlertAction>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Account</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate font-medium">{user.email}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">Email Status</dt>
              <dd>
                {isVerified ? (
                  <Badge variant="success">
                    <CircleCheck data-icon="inline-start" aria-hidden="true" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="warning">
                    <CircleAlert data-icon="inline-start" aria-hidden="true" />
                    Not Verified
                  </Badge>
                )}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">Member Since</dt>
              <dd className="font-medium">{user.created_at ? memberSinceFormat.format(new Date(user.created_at)) : '—'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>My Companies</h2>
          </CardTitle>
          <CardDescription>The businesses you work in, and your role in each.</CardDescription>
        </CardHeader>
        <CardContent>
          <MyCompaniesList />
        </CardContent>
      </Card>

      <PersonalInfoForm key={user.updated_at} user={user} />
      <ChangePasswordForm email={user.email} />
    </div>
  )
}
