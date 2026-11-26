import { useQuery } from '@tanstack/react-query'
import { Ellipsis, RefreshCw, RotateCcw, UserPlus, UserX } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ListPagination } from '@/components/list-pagination'
import { UserAvatar } from '@/components/user-avatar'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MembershipStatusBadge, OwnerBadge } from '@/components/company-badges'
import { ROLE_LABELS } from '@/lib/company'
import { useCurrentUser } from '@/features/auth/use-current-user'
import { companyQueries, type Company, type CompanyMember } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { canInCompany } from '../permissions'
import { ASSIGNABLE_ROLES } from '../roles'
import { useUpdateMember } from '../use-company-actions'
import { AddMemberDialog } from './add-member-dialog'

/** Members card: everyone can view; Owners and Admins add and change members (CW-1, CW-3, CW-4). */
export function CompanyMembersSection({ company }: { company: Company }) {
  const [page, setPage] = useState(1)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [deactivating, setDeactivating] = useState<CompanyMember | null>(null)
  const { data, error, isPending, isFetching, refetch } = useQuery(companyQueries.members(company.id, page))
  const { data: currentUser } = useCurrentUser()
  const updateMember = useUpdateMember(company.id)
  const canManage = canInCompany(company, 'manage-members')

  const canChange = (member: CompanyMember) => canManage && !member.is_owner && member.user.id !== currentUser?.id

  // Role changes and reactivation run from the menu without a dialog, so failures go to a toast.
  const onInlineError = { onError: (error: Error) => toast.error(error.message || "Couldn't update this member.") }
  const changeRole = (member: CompanyMember, role: (typeof ASSIGNABLE_ROLES)[number]['value']) => updateMember.mutate({ member, role }, onInlineError)
  const reactivate = (member: CompanyMember) => updateMember.mutate({ member, status: 'active' }, onInlineError)
  const startDeactivate = (member: CompanyMember) => {
    updateMember.reset()
    setDeactivating(member)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Members</h2>
        </CardTitle>
        <CardDescription>
          {canManage ? 'People who can work in this company and what they can do.' : 'People who work in this company.'}
        </CardDescription>
        {canManage && (
          <CardAction>
            <Button onClick={() => setIsAddOpen(true)}>
              <UserPlus data-icon="inline-start" aria-hidden="true" />
              Add Member
            </Button>
          </CardAction>
        )}
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
                    <TableHead>Status</TableHead>
                    <TableHead>Joined At</TableHead>
                    {canManage && (
                      <TableHead className="w-12 text-right">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPending
                    ? Array.from({ length: 3 }, (_, index) => (
                        <TableRow key={index}>
                          <TableCell colSpan={canManage ? 5 : 4}>
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
                                <span className="max-w-48 truncate font-medium">
                                  {member.user.name}
                                  {member.user.id === currentUser?.id && <span className="font-normal text-muted-foreground"> (You)</span>}
                                </span>
                                <span className="max-w-48 truncate text-xs text-muted-foreground">{member.user.email}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{member.is_owner ? <OwnerBadge /> : ROLE_LABELS[member.role]}</TableCell>
                          <TableCell>
                            <MembershipStatusBadge status={member.status} />
                          </TableCell>
                          <TableCell className="tabular-nums">{formatDate(member.joined_at)}</TableCell>
                          {canManage && (
                            <TableCell className="text-right">
                              {canChange(member) && (
                                <MemberActions
                                  member={member}
                                  onRoleChange={(role) => changeRole(member, role)}
                                  onReactivate={() => reactivate(member)}
                                  onDeactivate={() => startDeactivate(member)}
                                />
                              )}
                            </TableCell>
                          )}
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
                        <span className="truncate font-medium">
                          {member.user.name}
                          {member.user.id === currentUser?.id && <span className="font-normal text-muted-foreground"> (You)</span>}
                        </span>
                        <span className="truncate text-sm text-muted-foreground">{member.user.email}</span>
                        <div className="flex flex-wrap items-center gap-1.5 text-sm">
                          {member.is_owner ? <OwnerBadge /> : <span>{ROLE_LABELS[member.role]}</span>}
                          <MembershipStatusBadge status={member.status} />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">Joined {formatDate(member.joined_at)}</span>
                      </div>
                      {canChange(member) && (
                        <MemberActions
                          member={member}
                          onRoleChange={(role) => changeRole(member, role)}
                          onReactivate={() => reactivate(member)}
                          onDeactivate={() => startDeactivate(member)}
                        />
                      )}
                    </li>
                  ))}
            </ul>
            {data && <ListPagination meta={data.meta} onPageChange={setPage} />}
          </>
        )}
      </CardContent>

      {canManage && <AddMemberDialog companyId={company.id} open={isAddOpen} onOpenChange={setIsAddOpen} />}
      <ConfirmDialog
        open={deactivating !== null}
        onOpenChange={(open) => {
          if (!open) {
            updateMember.reset()
            setDeactivating(null)
          }
        }}
        title="Deactivate This Member?"
        description={
          <p>
            {deactivating?.user.name} will lose access to {company.name} immediately. Their account and history are kept, and you can reactivate
            them later.
          </p>
        }
        confirmLabel="Deactivate Member"
        onConfirm={() =>
          deactivating && updateMember.mutate({ member: deactivating, status: 'inactive' }, { onSuccess: () => setDeactivating(null) })
        }
        isPending={updateMember.isPending}
        error={updateMember.error}
        destructive
      />
    </Card>
  )
}

function MemberActions({
  member,
  onRoleChange,
  onReactivate,
  onDeactivate,
}: {
  member: CompanyMember
  onRoleChange: (role: (typeof ASSIGNABLE_ROLES)[number]['value']) => void
  onReactivate: () => void
  onDeactivate: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${member.user.name}`} />}>
        <Ellipsis aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {member.status === 'active' && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Change Role</DropdownMenuLabel>
              {ASSIGNABLE_ROLES.filter((item) => item.value !== member.role).map((item) => (
                <DropdownMenuItem key={item.value} onClick={() => onRoleChange(item.value)}>
                  Make {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDeactivate}>
              <UserX aria-hidden="true" />
              Deactivate
            </DropdownMenuItem>
          </>
        )}
        {member.status === 'inactive' && (
          <DropdownMenuItem onClick={onReactivate}>
            <RotateCcw aria-hidden="true" />
            Reactivate
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
