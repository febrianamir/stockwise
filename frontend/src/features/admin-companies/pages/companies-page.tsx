import { useQuery } from '@tanstack/react-query'
import { Plus, RefreshCw } from 'lucide-react'
import { Link } from 'react-router'
import { ListPagination } from '@/components/list-pagination'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { adminCompanyQueries } from '@/lib/api'
import { CompaniesTable } from '../components/companies-table'
import { CompaniesToolbar } from '../components/companies-toolbar'
import { CompanyStats } from '../components/company-stats'
import { DEFAULT_DIRECTION, DEFAULT_SORT, useCompanyFilters } from '../use-company-filters'

/** /admin/companies: docs/features/company-management/prd.md §6.1. */
export function CompaniesPage() {
  const { filters, update, clear, hasActiveFilters } = useCompanyFilters()
  const { data, error, isPending, isPlaceholderData, isFetching, refetch } = useQuery(adminCompanyQueries.list(filters))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
            <Badge variant="info">Platform Admin</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Manage every business (tenant) on the Stockwise platform.</p>
        </div>
        <Button render={<Link to="/admin/companies/new" />} nativeButton={false}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          New Company
        </Button>
      </div>

      <CompanyStats />

      <section aria-label="Companies" className="flex flex-col gap-4">
        <CompaniesToolbar filters={filters} update={update} clear={clear} hasActiveFilters={hasActiveFilters} />

        {error && !data ? (
          <Alert variant="destructive">
            <AlertDescription>Couldn't load companies. {error.message}</AlertDescription>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw data-icon="inline-start" aria-hidden="true" />
                Retry
              </Button>
            </AlertAction>
          </Alert>
        ) : (
          <>
            <CompaniesTable
              companies={data?.data}
              isLoading={isPending}
              isStale={isPlaceholderData}
              sort={filters.sort ?? DEFAULT_SORT}
              direction={filters.direction ?? DEFAULT_DIRECTION}
              onSort={(sort, direction) => update({ sort, direction })}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clear}
            />
            {data && <ListPagination meta={data.meta} onPageChange={(page) => update({ page })} />}
          </>
        )}
      </section>
    </div>
  )
}
