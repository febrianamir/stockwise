import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { OwnerBadge } from '@/components/company-badges'
import { ListPagination } from '@/components/list-pagination'
import { UserAvatar } from '@/components/user-avatar'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { branchQueries, type CompanyMember } from '@/lib/api'
import { ROLE_LABELS } from '@/lib/company'

/** "All Branches" for the owner and scope `all`; "This Branch" for an explicit grant. */
function accessLabel(member: CompanyMember): string {
  return member.branch_scope === 'all' ? 'All Branches' : 'This Branch'
}

/** Members who can work in the branch (branch-management PRD §8.3). Access is changed from the company's member list. */
export function BranchMembersSection({ companyId, branchId, canManageAccess }: { companyId: string; branchId: string; canManageAccess: boolean }) {
  const [page, setPage] = useState(1)
  const { data, error, isPending, isFetching, refetch } = useQuery(branchQueries.members(companyId, branchId, page))

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Members</h2>
        </CardTitle>
        <CardDescription>
          {canManageAccess
            ? "Active members who can work in this branch. Change someone's access from the company's member list."
            : 'Active members who can work in this branch.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && !data ? (
          <Alert variant="destructive">
            <AlertDescription>Couldn't load members. {error.message}</AlertDescription>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw data-icon="inline-start" aria-hidden="true" />
                Retry
              </Button>
            </AlertAction>
          </Alert>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Access</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPending
                    ? Array.from({ length: 3 }, (_, index) => (
                        <TableRow key={index}>
                          <TableCell colSpan={3}>
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
                                <span className="max-w-56 truncate font-medium">{member.user.name}</span>
                                <span className="max-w-56 truncate text-xs text-muted-foreground">{member.user.email}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{member.is_owner ? <OwnerBadge /> : ROLE_LABELS[member.role]}</TableCell>
                          <TableCell className="text-muted-foreground">{accessLabel(member)}</TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>

            <ul className="flex flex-col divide-y rounded-xl border md:hidden">
              {isPending
                ? Array.from({ length: 3 }, (_, index) => (
                    <li key={index} className="p-3">
                      <Skeleton className="h-10 w-full" />
                    </li>
                  ))
                : data?.data.map((member) => (
                    <li key={member.id} className="flex items-start gap-3 p-3">
                      <UserAvatar name={member.user.name} />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="truncate font-medium">{member.user.name}</span>
                        <span className="truncate text-sm text-muted-foreground">{member.user.email}</span>
                        <div className="flex flex-wrap items-center gap-1.5 text-sm">
                          {member.is_owner ? <OwnerBadge /> : <span>{ROLE_LABELS[member.role]}</span>}
                          <span className="text-muted-foreground">· {accessLabel(member)}</span>
                        </div>
                      </div>
                    </li>
                  ))}
            </ul>
            {data && <ListPagination meta={data.meta} onPageChange={setPage} />}
          </>
        )}
      </CardContent>
    </Card>
  )
}
