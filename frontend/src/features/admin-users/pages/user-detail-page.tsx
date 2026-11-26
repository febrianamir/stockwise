import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, RefreshCw, RotateCcw, ShieldCheck, ShieldOff, UserX } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { PageLoading } from '@/components/page-status'
import { UserAvatar } from '@/components/user-avatar'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrentUser } from '@/features/auth/use-current-user'
import { NotFoundPage } from '@/features/not-found-page'
import { adminUserQueries, type AdminUserDetail } from '@/lib/api'
import { SuperadminDialog } from '../components/superadmin-dialog'
import { SuperadminBadge, UserStatusBadge, VerificationBadge } from '../components/user-badges'
import { UserMemberships } from '../components/user-memberships'
import { UserStatusDialog, type StatusAction } from '../components/user-status-dialog'
import { formatDateTime } from '@/lib/format'
import { ACTIVITY_LABELS, STATUS_LABELS } from '../format'

/** /admin/users/:userId: PRD §6.3 to §6.6. */
export function UserDetailPage() {
  const userId = Number(useParams().userId)
  const isValidId = Number.isInteger(userId) && userId > 0
  const { data: user, error, isPending, refetch, isFetching } = useQuery({
    ...adminUserQueries.detail(userId),
    enabled: isValidId,
  })

  if (!isValidId || error?.status === 404) {
    return <NotFoundPage embedded />
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Couldn't load this user. {error.message}</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            Retry
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  if (isPending) {
    return <PageLoading label="Loading user…" />
  }

  return <UserDetail user={user} />
}

function UserDetail({ user }: { user: AdminUserDetail }) {
  const { data: currentUser } = useCurrentUser()
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null)
  const [isSuperadminOpen, setIsSuperadminOpen] = useState(false)
  const isSelf = currentUser?.id === user.id
  const canGrantSuperadmin = user.status === 'active' && user.email_verified_at !== null

  return (
    <div className="flex flex-col gap-6">
      <Link to="/admin/users" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        All Users
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar name={user.name} size="lg" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{user.name}</h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <UserStatusBadge status={user.status} />
              <VerificationBadge verified={user.email_verified_at !== null} />
              {user.is_superadmin && <SuperadminBadge />}
            </div>
          </div>
        </div>
        {!isSelf && (
          <div className="flex flex-wrap gap-2">
            {(user.is_superadmin || canGrantSuperadmin) && (
              <Button variant="outline" onClick={() => setIsSuperadminOpen(true)}>
                {user.is_superadmin ? (
                  <ShieldOff data-icon="inline-start" aria-hidden="true" />
                ) : (
                  <ShieldCheck data-icon="inline-start" aria-hidden="true" />
                )}
                {user.is_superadmin ? 'Remove Superadmin' : 'Make Superadmin'}
              </Button>
            )}
            {user.status === 'inactive' ? (
              <Button variant="outline" onClick={() => setStatusAction('reactivate')}>
                <RotateCcw data-icon="inline-start" aria-hidden="true" />
                Reactivate User
              </Button>
            ) : (
              <Button variant="destructive" onClick={() => setStatusAction('deactivate')}>
                <UserX data-icon="inline-start" aria-hidden="true" />
                Deactivate User
              </Button>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Profile Information</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="ID">
              <span className="tabular-nums">{user.id}</span>
            </DetailItem>
            <DetailItem label="Name">{user.name}</DetailItem>
            <DetailItem label="Email">
              <span className="break-all">{user.email}</span>
            </DetailItem>
            <DetailItem label="Account Status">{STATUS_LABELS[user.status]}</DetailItem>
            <DetailItem label="Email Verified">
              {user.email_verified_at ? `Yes, ${formatDateTime(user.email_verified_at)}` : 'No'}
            </DetailItem>
            <DetailItem label="Created At">{formatDateTime(user.created_at)}</DetailItem>
            <DetailItem label="Updated At">{formatDateTime(user.updated_at)}</DetailItem>
            <DetailItem label="Last Login">{user.last_login_at ? formatDateTime(user.last_login_at) : 'Never'}</DetailItem>
          </dl>
        </CardContent>
      </Card>

      <UserMemberships memberships={user.memberships} />

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Account Activity</h2>
          </CardTitle>
          <CardDescription>Account changes and the last successful login, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {user.activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recorded activity yet.</p>
          ) : (
            <ol className="flex flex-col gap-3 border-l pl-4">
              {user.activity.map((entry) => (
                <li key={entry.id ?? entry.action} className="flex flex-col gap-0.5 text-sm">
                  <span className="font-medium">{ACTIVITY_LABELS[entry.action]}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatDateTime(entry.occurred_at)}
                    {entry.actor && entry.actor.id !== user.id && <> · by {entry.actor.name}</>}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <UserStatusDialog user={user} action={statusAction} onClose={() => setStatusAction(null)} />
      <SuperadminDialog user={user} open={isSuperadminOpen} onClose={() => setIsSuperadminOpen(false)} />
    </div>
  )
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}
