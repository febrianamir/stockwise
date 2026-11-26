import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { ListPagination } from '@/components/list-pagination'
import { UserAvatar } from '@/components/user-avatar'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserStatusBadge } from '@/features/admin-users/components/user-badges'
import { adminCompanyQueries } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { ROLE_LABELS } from '@/lib/company'
import { MembershipStatusBadge, OwnerBadge } from '@/components/company-badges'

/** Members tab: read-only (PRD §6.3). Owners and Admins manage members in the company workspace (CW-3, CW-4). */
export function CompanyMembers({ companyId }: { companyId: string }) {
  const [page, setPage] = useState(1)
  const { data, error, isPending, isFetching, refetch } = useQuery(adminCompanyQueries.members(companyId, { page }))

  if (error && !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Couldn't load members. {error.message}</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            Retry
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Read-only. The company's Owner and Admins manage members in their workspace.</p>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Membership</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Joined At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending
              ? Array.from({ length: 3 }, (_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : data?.data.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserAvatar name={member.user.name} size="sm" />
                        <div className="flex min-w-0 flex-col">
                          <Link to={`/admin/users/${member.user.id}`} className="max-w-48 truncate font-medium underline-offset-4 hover:underline">
                            {member.user.name}
                          </Link>
                          <span className="max-w-48 truncate text-xs text-muted-foreground">{member.user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{member.is_owner ? <OwnerBadge /> : ROLE_LABELS[member.role]}</TableCell>
                    <TableCell>
                      <MembershipStatusBadge status={member.status} />
                    </TableCell>
                    <TableCell>
                      <UserStatusBadge status={member.user.status} />
                    </TableCell>
                    <TableCell className="tabular-nums">{formatDate(member.joined_at)}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
      {data && <ListPagination meta={data.meta} onPageChange={setPage} />}
    </div>
  )
}
