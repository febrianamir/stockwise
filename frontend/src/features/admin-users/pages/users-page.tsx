import { useQuery } from '@tanstack/react-query'
import { RefreshCw, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { adminUserQueries } from '@/lib/api'
import { CreateUserDialog } from '../components/create-user-dialog'
import { UserStats } from '../components/user-stats'
import { UsersPagination } from '../components/users-pagination'
import { UsersTable } from '../components/users-table'
import { UsersToolbar } from '../components/users-toolbar'
import { DEFAULT_DIRECTION, DEFAULT_SORT, useUserFilters } from '../use-user-filters'

/** /admin/users: docs/features/user-management/prd.md §6.1 and §8. */
export function UsersPage() {
  const { filters, update, clear, hasActiveFilters } = useUserFilters()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const { data, error, isPending, isPlaceholderData, isFetching, refetch } = useQuery(adminUserQueries.list(filters))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
            <Badge variant="info">Platform Admin</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Manage all registered users across the Stockwise platform.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <UserPlus data-icon="inline-start" aria-hidden="true" />
          Add User
        </Button>
      </div>

      <UserStats />

      <section aria-label="Users" className="flex flex-col gap-4">
        <UsersToolbar filters={filters} update={update} clear={clear} hasActiveFilters={hasActiveFilters} />

        {error && !data ? (
          <Alert variant="destructive">
            <AlertDescription>Couldn't load users. {error.message}</AlertDescription>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw data-icon="inline-start" aria-hidden="true" />
                Retry
              </Button>
            </AlertAction>
          </Alert>
        ) : (
          <>
            <UsersTable
              users={data?.data}
              isLoading={isPending}
              isStale={isPlaceholderData}
              sort={filters.sort ?? DEFAULT_SORT}
              direction={filters.direction ?? DEFAULT_DIRECTION}
              onSort={(sort, direction) => update({ sort, direction })}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clear}
            />
            {data && <UsersPagination meta={data.meta} onPageChange={(page) => update({ page })} />}
          </>
        )}
      </section>

      <CreateUserDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  )
}
