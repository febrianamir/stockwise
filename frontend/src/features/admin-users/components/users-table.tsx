import { ArrowDown, ArrowUp, ArrowUpDown, SearchX } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { UserAvatar } from '@/components/user-avatar'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AdminUser, AdminUserSort, SortDirection } from '@/lib/api'
import { cn } from '@/lib/utils'
import { formatDate, formatDateTime } from '../format'
import { SuperadminBadge, UserStatusBadge, VerificationBadge } from './user-badges'
import { UserRowActions } from './user-row-actions'
import { UserStatusDialog, type StatusAction } from './user-status-dialog'

const SKELETON_ROWS = 5

interface UsersTableProps {
  users: AdminUser[] | undefined
  isLoading: boolean
  isStale: boolean
  sort: AdminUserSort
  direction: SortDirection
  onSort: (sort: AdminUserSort, direction: SortDirection) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
}

/** Desktop table and mobile list of users (PRD §8). */
export function UsersTable({ users, isLoading, isStale, sort, direction, onSort, hasActiveFilters, onClearFilters }: UsersTableProps) {
  // One confirmation dialog for the whole table, opened from any row's menu.
  const [pending, setPending] = useState<{ user: AdminUser; action: StatusAction } | null>(null)
  const openAction = (user: AdminUser, action: StatusAction) => setPending({ user, action })

  if (!isLoading && users?.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No users match these filters.</EmptyTitle>
          <EmptyDescription>Try a different search, or clear the filters to see every user.</EmptyDescription>
        </EmptyHeader>
        {hasActiveFilters && (
          <EmptyContent>
            <Button variant="outline" onClick={onClearFilters}>
              Clear Filters
            </Button>
          </EmptyContent>
        )}
      </Empty>
    )
  }

  const sortable = (column: AdminUserSort, label: string) => (
    <SortableHead column={column} label={label} sort={sort} direction={direction} onSort={onSort} />
  )

  return (
    <div aria-busy={isLoading || isStale} className={cn('transition-opacity', isStale && 'opacity-60')}>
      <div className="hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {sortable('name', 'User')}
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Email Verification</TableHead>
              {sortable('created_at', 'Created At')}
              {sortable('last_login_at', 'Last Login')}
              <TableHead className="w-12 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserAvatar name={user.name} size="sm" />
                        <Link
                          to={`/admin/users/${user.id}`}
                          className="max-w-40 truncate font-medium underline-offset-4 hover:underline"
                        >
                          {user.name}
                        </Link>
                        {user.is_superadmin && <SuperadminBadge />}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-muted-foreground" title={user.email}>{user.email}</TableCell>
                    <TableCell>
                      <UserStatusBadge status={user.status} />
                    </TableCell>
                    <TableCell>
                      <VerificationBadge verified={user.email_verified_at !== null} />
                    </TableCell>
                    <TableCell className="tabular-nums">{formatDate(user.created_at)}</TableCell>
                    <TableCell
                      className="tabular-nums text-muted-foreground"
                      title={user.last_login_at ? formatDateTime(user.last_login_at) : undefined}
                    >
                      {user.last_login_at ? formatDate(user.last_login_at) : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <UserRowActions user={user} onAction={openAction} />
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col divide-y rounded-xl border bg-card md:hidden">
        {isLoading
          ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <li key={index} className="p-3">
                <Skeleton className="h-12 w-full" />
              </li>
            ))
          : users?.map((user) => (
              <li key={user.id} className="flex items-start gap-3 p-3">
                <UserAvatar name={user.name} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link to={`/admin/users/${user.id}`} className="truncate font-medium underline-offset-4 hover:underline">
                    {user.name}
                  </Link>
                  <span className="truncate text-sm text-muted-foreground">{user.email}</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <UserStatusBadge status={user.status} />
                    <VerificationBadge verified={user.email_verified_at !== null} />
                    {user.is_superadmin && <SuperadminBadge />}
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">Joined {formatDate(user.created_at)}</span>
                </div>
                <UserRowActions user={user} onAction={openAction} />
              </li>
            ))}
      </ul>

      {pending && <UserStatusDialog user={pending.user} action={pending.action} onClose={() => setPending(null)} />}
    </div>
  )
}

function SortableHead({
  column,
  label,
  sort,
  direction,
  onSort,
}: {
  column: AdminUserSort
  label: string
  sort: AdminUserSort
  direction: SortDirection
  onSort: (sort: AdminUserSort, direction: SortDirection) => void
}) {
  const isActive = sort === column
  const Icon = !isActive ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown
  // Names read naturally A→Z; dates newest first.
  const firstDirection: SortDirection = column === 'name' ? 'asc' : 'desc'
  const nextDirection: SortDirection = isActive ? (direction === 'asc' ? 'desc' : 'asc') : firstDirection

  return (
    <TableHead aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      {/* Same size and weight as the plain column headers. */}
      <Button variant="ghost" size="sm" className="-ml-2 text-sm font-medium" onClick={() => onSort(column, nextDirection)}>
        {label}
        <Icon data-icon="inline-end" aria-hidden="true" className={cn(!isActive && 'text-muted-foreground')} />
      </Button>
    </TableHead>
  )
}
